import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, update, remove, push, set } from 'firebase/database';

interface Task {
  currentUsers: {};
  id: string;
  name: string;
  reward: number;
  category: string;
  totalRequired: number;
  completed?: number;
  progress?: number;
  url?: string;
  buttonText?: string;
  telegramChannel?: string;
  checkMembership?: boolean;
  usersQuantity?: number;
  dailyLimit?: number;
  lastReset?: string;
  completedUsers?: number;
}

const AdminPanel: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [newTask, setNewTask] = useState({
    name: '',
    reward: 0,
    category: 'Socials Tasks',
    totalRequired: 1,
    url: '',
    telegramChannel: '',
    checkMembership: false,
    usersQuantity: 100,
  });

  const database = getDatabase();

  useEffect(() => {
    const tasksRef = ref(database, 'tasks');
    onValue(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const tasksData: Task[] = [];
        snapshot.forEach((childSnapshot) => {
          const taskData = childSnapshot.val();
          tasksData.push({ 
            ...taskData, 
            id: childSnapshot.key,
            completedUsers: taskData.completedUsers || 0
          });
        });
        setTasks(tasksData);
      }
    });
  }, [database]);

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await update(ref(database, `tasks/${taskId}`), updates);
      alert('Task updated successfully!');
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error updating task');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await remove(ref(database, `tasks/${taskId}`));
        alert('Task deleted successfully!');
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Error deleting task');
      }
    }
  };

  const addNewTask = async () => {
    if (!newTask.name || newTask.reward <= 0) {
      alert('Please fill all fields correctly!');
      return;
    }

    if (newTask.url && !isValidUrl(newTask.url)) {
      alert('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    // Validate Telegram channel format if provided
    if (newTask.telegramChannel && !isValidTelegramChannel(newTask.telegramChannel)) {
      alert('Please enter a valid Telegram channel username (without @)');
      return;
    }

    try {
      const tasksRef = ref(database, 'tasks');
      const newTaskRef = push(tasksRef);

      const taskData: any = {
        name: newTask.name,
        reward: newTask.reward,
        category: newTask.category,
        totalRequired: newTask.totalRequired,
        completed: 0,
        progress: 0,
        lastReset: new Date().toISOString(),
        currentUsers: {},
        usersQuantity: newTask.usersQuantity || 100,
        completedUsers: 0
      };

      // Add URL only for Socials Tasks
      if (newTask.url && newTask.category === 'Socials Tasks') {
        taskData.url = newTask.url;
      }

      // Add Telegram-specific fields for TG Tasks
      if (newTask.category === 'TG Tasks') {
        if (newTask.telegramChannel) {
          taskData.telegramChannel = newTask.telegramChannel;
        }
        taskData.checkMembership = newTask.checkMembership;
        taskData.usersQuantity = newTask.usersQuantity;
      }

      await set(newTaskRef, taskData);

      // Reset form
      setNewTask({
        name: '',
        reward: 0,
        category: 'Socials Tasks',
        totalRequired: 1,
        url: '',
        telegramChannel: '',
        checkMembership: false,
        usersQuantity: 100,
      });
      setShowAddTask(false);
      alert('Task added successfully!');
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Error adding task');
    }
  };

  const isValidUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const isValidTelegramChannel = (channel: string) => {
    // Telegram channel usernames can contain a-z, 0-9, and underscores, 5-32 characters
    const telegramRegex = /^[a-zA-Z0-9_]{5,32}$/;
    return telegramRegex.test(channel);
  };

  const resetSpecificTaskProgress = async (taskId: string) => {
    if (window.confirm('Are you sure you want to reset progress for this specific task for all users?')) {
      try {
        const usersRef = ref(database, 'users');
        onValue(usersRef, (snap) => {
          if (snap.exists()) {
            const updates: any = {};
            snap.forEach((userSnap) => {
              updates[`${userSnap.key}/tasksCompleted/${taskId}`] = 0;
            });
            update(ref(database, 'users'), updates);
          }
        }, { onlyOnce: true });

        await update(ref(database, `tasks/${taskId}`), {
          completed: 0,
          progress: 0,
          lastReset: new Date().toISOString(),
          currentUsers: {},
          completedUsers: 0
        });

        alert('Task progress reset successfully!');
      } catch (error) {
        console.error('Error resetting task progress:', error);
        alert('Error resetting task progress');
      }
    }
  };

  const resetDailyLimits = async (taskId: string) => {
    if (window.confirm('Are you sure you want to reset daily limits for this task?')) {
      try {
        await update(ref(database, `tasks/${taskId}`), {
          lastReset: new Date().toISOString()
        });

        alert('Daily limits reset successfully!');
      } catch (error) {
        console.error('Error resetting daily limits:', error);
        alert('Error resetting daily limits');
      }
    }
  };

  const resetUsersLimit = async (taskId: string) => {
    if (window.confirm('Are you sure you want to reset the users limit for this task?')) {
      try {
        await update(ref(database, `tasks/${taskId}`), {
          completedUsers: 0
        });

        alert('Users limit reset successfully!');
      } catch (error) {
        console.error('Error resetting users limit:', error);
        alert('Error resetting users limit');
      }
    }
  };

  const categoryOptions = [
    'Socials Tasks',
    'TG Tasks'
  ];

  const filterOptions = [
    'All',
    'Socials Tasks',
    'TG Tasks',
    'Completed',
    'Active'
  ];

  // Check if task has reached users limit
  const isTaskCompleted = (task: Task) => {
    const usersQuantity = task.usersQuantity || 0;
    const completedUsers = task.completedUsers || 0;
    return usersQuantity > 0 && completedUsers >= usersQuantity;
  };

  // Filter tasks based on selected filter
  const filteredTasks = tasks.filter(task => {
    if (categoryFilter === 'All') return true;
    if (categoryFilter === 'Socials Tasks') return task.category === 'Socials Tasks';
    if (categoryFilter === 'TG Tasks') return task.category === 'TG Tasks';
    if (categoryFilter === 'Completed') return isTaskCompleted(task);
    if (categoryFilter === 'Active') return !isTaskCompleted(task);
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Tasks Section */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Task Management</h2>
            </div>
            
            {/* Filter and Add Task Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Category Filter */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-1">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent border-0 text-white text-sm focus:ring-0 focus:outline-none px-3 py-2"
                >
                  {filterOptions.map(option => (
                    <option key={option} value={option} className="bg-gray-800">
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowAddTask(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-green-500/20 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Task
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <div className="text-2xl font-bold text-white">{tasks.length}</div>
              <div className="text-gray-400 text-sm">Total Tasks</div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <div className="text-2xl font-bold text-blue-400">
                {tasks.filter(task => task.category === 'Socials Tasks').length}
              </div>
              <div className="text-gray-400 text-sm">Social Tasks</div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <div className="text-2xl font-bold text-purple-400">
                {tasks.filter(task => task.category === 'TG Tasks').length}
              </div>
              <div className="text-gray-400 text-sm">TG Tasks</div>
            </div>
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
              <div className="text-2xl font-bold text-green-400">
                {tasks.filter(task => isTaskCompleted(task)).length}
              </div>
              <div className="text-gray-400 text-sm">Completed</div>
            </div>
          </div>

          {/* Scrollable Tasks Container */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
            <div className="max-h-96 overflow-y-auto pr-2">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No tasks found for the selected filter</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredTasks.map((task) => {
                    const isCompleted = isTaskCompleted(task);
                    const usersQuantity = task.usersQuantity || 0;
                    const completedUsers = task.completedUsers || 0;
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border transition-all duration-300 ${
                          isCompleted 
                            ? 'border-green-500/30 bg-green-500/5' 
                            : 'border-gray-700/50 hover:border-gray-600/50'
                        }`}
                      >
                        {/* Completed Status Badge */}
                        {isCompleted && (
                          <div className="flex justify-between items-center mb-4">
                            <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold border border-green-500/30 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Completed (Users Limit Reached)
                            </div>
                            <button
                              onClick={() => resetUsersLimit(task.id)}
                              className="bg-green-500/20 hover:bg-green-500/30 px-3 py-1 rounded-lg border border-green-500/30 hover:border-green-500/50 transition-all duration-200 text-green-400 text-sm font-medium flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Reset Limit
                            </button>
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className={`font-bold text-xl ${
                                isCompleted ? 'text-green-400' : 'text-white'
                              }`}>
                                {task.name}
                              </h3>
                              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                                task.category === 'TG Tasks' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                task.category === 'Socials Tasks' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                              }`}>
                                {task.category}
                              </span>
                            </div>

                            {/* Telegram Channel Info */}
                            {task.telegramChannel && (
                              <div className="mb-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <p className="text-sm font-medium text-blue-300 mb-1">Telegram Channel:</p>
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                                  </svg>
                                  <span className="text-blue-400 font-medium">@{task.telegramChannel}</span>
                                  {task.checkMembership && (
                                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
                                      Membership Check
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Website URL - Only show for Socials Tasks */}
                            {task.url && task.category === 'Socials Tasks' && (
                              <div className="mb-4 p-4 bg-gray-700/30 rounded-xl border border-gray-600/50">
                                <p className="text-sm font-medium text-blue-300 mb-2">Website URL:</p>
                                <a 
                                  href={task.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-400 hover:text-blue-300 transition-colors break-all text-sm font-medium flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  {task.url}
                                </a>
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => resetDailyLimits(task.id)}
                              className="bg-yellow-500/20 hover:bg-yellow-500/30 p-2.5 rounded-xl border border-yellow-500/30 hover:border-yellow-500/50 transition-all duration-200"
                              title="Reset Daily Limits"
                            >
                              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => resetSpecificTaskProgress(task.id)}
                              className="bg-orange-500/20 hover:bg-orange-500/30 p-2.5 rounded-xl border border-orange-500/30 hover:border-orange-500/50 transition-all duration-200"
                              title="Reset Progress for All Users"
                            >
                              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="bg-red-500/20 hover:bg-red-500/30 p-2.5 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-all duration-200"
                              title="Delete Task"
                            >
                              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Stats and Edit Buttons */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-4 border-t border-gray-700/50">
                          <div className="flex flex-wrap gap-6">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-500/20 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-green-400 font-bold text-lg">${task.reward.toFixed(2)}</p>
                                <p className="text-gray-400 text-sm">Reward</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="bg-yellow-500/20 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-yellow-400 font-bold text-lg">{task.totalRequired}</p>
                                <p className="text-gray-400 text-sm">Required</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="bg-purple-500/20 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-purple-400 font-bold text-lg">{task.completed || 0}</p>
                                <p className="text-gray-400 text-sm">Completed</p>
                              </div>
                            </div>

                            {/* Users Quantity Stats */}
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                isCompleted ? 'bg-green-500/20' : 'bg-indigo-500/20'
                              }`}>
                                <svg className={`w-4 h-4 ${isCompleted ? 'text-green-400' : 'text-indigo-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className={`font-bold text-lg ${
                                  isCompleted ? 'text-green-400' : 'text-indigo-400'
                                }`}>
                                  {completedUsers}/{usersQuantity}
                                </p>
                                <p className="text-gray-400 text-sm">Users Progress</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                const newReward = prompt('Enter new reward:', task.reward.toString());
                                if (newReward && !isNaN(parseFloat(newReward))) {
                                  updateTask(task.id, { reward: parseFloat(newReward) });
                                }
                              }}
                              className="bg-blue-500/20 hover:bg-blue-500/30 px-4 py-2.5 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 text-blue-300 font-medium text-sm flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Reward
                            </button>
                            <button
                              onClick={() => {
                                const newRequired = prompt('Enter new required count:', task.totalRequired.toString());
                                if (newRequired && !isNaN(parseInt(newRequired))) {
                                  updateTask(task.id, { totalRequired: parseInt(newRequired) });
                                }
                              }}
                              className="bg-purple-500/20 hover:bg-purple-500/30 px-4 py-2.5 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all duration-200 text-purple-300 font-medium text-sm flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Required
                            </button>
                            <button
                              onClick={() => {
                                const newUsersQuantity = prompt('Enter new users quantity:', (task.usersQuantity || 100).toString());
                                if (newUsersQuantity && !isNaN(parseInt(newUsersQuantity))) {
                                  updateTask(task.id, { usersQuantity: parseInt(newUsersQuantity) });
                                }
                              }}
                              className="bg-indigo-500/20 hover:bg-indigo-500/30 px-4 py-2.5 rounded-xl border border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-200 text-indigo-300 font-medium text-sm flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Users Qty
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Add Task Modal */}
          {showAddTask && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-white">Add New Task</h3>
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-xl"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Task Name *</label>
                    <input
                      type="text"
                      placeholder="Enter task name"
                      value={newTask.name}
                      onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                      className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Category *</label>
                    <select
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                    >
                      {categoryOptions.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Reward Amount ($) *</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newTask.reward}
                      onChange={(e) => setNewTask({ ...newTask, reward: parseFloat(e.target.value) || 0 })}
                      className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                      min="0"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Total Required *</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={newTask.totalRequired}
                      onChange={(e) => setNewTask({ ...newTask, totalRequired: parseInt(e.target.value) || 1 })}
                      className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                      min="1"
                    />
                  </div>

                  {/* Users Quantity Field - Show for all task types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Users Quantity *</label>
                    <input
                      type="number"
                      placeholder="100"
                      value={newTask.usersQuantity}
                      onChange={(e) => setNewTask({ ...newTask, usersQuantity: parseInt(e.target.value) || 100 })}
                      className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                      min="1"
                    />
                    <p className="text-gray-400 text-xs mt-2">Maximum number of users who can work on this task simultaneously</p>
                  </div>

                  {/* Telegram Channel Fields (only for TG Tasks) */}
                  {newTask.category === 'TG Tasks' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Telegram Channel Username</label>
                        <input
                          type="text"
                          placeholder="channelname (without @)"
                          value={newTask.telegramChannel}
                          onChange={(e) => setNewTask({ ...newTask, telegramChannel: e.target.value })}
                          className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                        />
                        <p className="text-gray-400 text-xs mt-2">Enter the channel username without @ symbol</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="checkMembership"
                          checked={newTask.checkMembership}
                          onChange={(e) => setNewTask({ ...newTask, checkMembership: e.target.checked })}
                          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <label htmlFor="checkMembership" className="text-sm font-medium text-gray-300">
                          Check if user is already a member
                        </label>
                      </div>
                    </>
                  )}

                  {/* Website URL Field - Only show for Socials Tasks */}
                  {newTask.category === 'Socials Tasks' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">Website URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://example.com"
                        value={newTask.url}
                        onChange={(e) => setNewTask({ ...newTask, url: e.target.value })}
                        className="w-full p-4 bg-gray-700/50 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white transition-all duration-200"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-4 mt-8 pt-6 border-t border-gray-700/50">
                  <button
                    onClick={addNewTask}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-3 flex-1 justify-center shadow-lg hover:shadow-green-500/20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Task
                  </button>
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="bg-gray-700/50 hover:bg-gray-700/70 px-8 py-4 rounded-xl font-semibold transition-all duration-200 border border-gray-600/50 flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;