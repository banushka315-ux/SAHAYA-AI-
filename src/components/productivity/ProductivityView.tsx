import React, { useState, useEffect } from 'react';
import { TaskItem } from '../../types';
import { api } from '../../services/api';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Filter,
  CheckCircle2,
  Clock,
  Tag,
} from 'lucide-react';

export const ProductivityView: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<TaskItem['category']>('work');
  const [newPriority, setNewPriority] = useState<TaskItem['priority']>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [aiPlanPrompt, setAiPlanPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  };

  const handleToggleComplete = async (task: TaskItem) => {
    try {
      const updated = await api.updateTask(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      console.error('Failed to update task:', e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const task = await api.createTask({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory,
        priority: newPriority,
        dueDate: newDueDate || undefined,
      });
      setTasks((prev) => [task, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setIsAdding(false);
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  };

  // Generate actionable tasks via SAHAYA AI
  const handleAiGenerateTasks = async () => {
    if (!aiPlanPrompt.trim()) return;
    setIsAiGenerating(true);

    try {
      const messages = [
        {
          id: 'prompt',
          role: 'user' as const,
          content: `Generate 3 to 4 concrete, actionable to-do tasks for the following goal: "${aiPlanPrompt}". 
Return ONLY a valid JSON array of objects with the structure:
[
  { "title": "string", "description": "string", "category": "work|study|personal|coding", "priority": "low|medium|high" }
]
Do not include any other markdown text, only raw JSON.`,
          timestamp: Date.now(),
        },
      ];

      const res = await api.sendChatMessage(undefined, messages, 'chat');
      const text = res.response.content;

      // Extract JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const item of parsed) {
          if (item.title) {
            const created = await api.createTask({
              title: item.title,
              description: item.description,
              category: item.category || 'work',
              priority: item.priority || 'medium',
            });
            setTasks((prev) => [created, ...prev]);
          }
        }
        setAiPlanPrompt('');
      }
    } catch (e) {
      console.error('AI plan error:', e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterStatus === 'active' && t.completed) return false;
    if (filterStatus === 'completed' && !t.completed) return false;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-cyan-400" />
              <span>Productivity & Tasks</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Organize daily priorities, manage study goals, and let SAHAYA generate actionable checklists.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* AI Task Generator Card */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl shadow-lg space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Generate Tasks with SAHAYA</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Prepare for React and Node.js technical interview in 3 days"
              value={aiPlanPrompt}
              onChange={(e) => setAiPlanPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAiGenerateTasks();
              }}
              disabled={isAiGenerating}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleAiGenerateTasks}
              disabled={isAiGenerating || !aiPlanPrompt.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-xl text-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isAiGenerating ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Generate</span>
            </button>
          </div>
        </div>

        {/* New Task Inline Form */}
        {isAdding && (
          <form
            onSubmit={handleCreateTask}
            className="p-5 bg-slate-900 border border-slate-700 rounded-2xl space-y-4 shadow-xl"
          >
            <h2 className="text-sm font-bold text-white">Create New Task</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <textarea
                placeholder="Description or notes (optional)..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="work">Work</option>
                    <option value="study">Study</option>
                    <option value="personal">Personal</option>
                    <option value="coding">Coding</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow"
              >
                Save Task
              </button>
            </div>
          </form>
        )}

        {/* Filter Toolbar (Segmented Controls) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status filters */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === 'active' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({tasks.length - completedCount})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === 'completed' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 text-slate-400">
            <Tag className="w-3.5 h-3.5" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="work">Work</option>
              <option value="study">Study</option>
              <option value="coding">Coding</option>
              <option value="personal">Personal</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No tasks in this view</p>
              <p className="text-xs text-slate-500 mt-1">
                Add a task above or ask SAHAYA to generate a plan for you!
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3.5 bg-slate-900/70 border rounded-xl flex items-start justify-between gap-3 transition-all ${
                  task.completed
                    ? 'border-slate-800/40 opacity-60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className="mt-0.5 text-cyan-400 hover:text-cyan-300 shrink-0"
                  >
                    {task.completed ? (
                      <CheckSquare className="w-4 h-4 fill-cyan-950 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={`text-xs font-semibold leading-snug ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Metadata line (Zero-pill text discipline) */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
                      <span className="capitalize">{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          task.priority === 'high'
                            ? 'text-rose-400 font-medium'
                            : task.priority === 'medium'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }
                      >
                        {task.priority} priority
                      </span>
                      {task.dueDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Due {task.dueDate}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
