import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, ArrowLeft, Shield } from 'lucide-react';
import { DictionaryEntry, User, Role } from './types';
import { getUsers, addUser, deleteUser } from './services/authService';

interface AdminPanelProps {
  dict: DictionaryEntry;
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ dict, onBack }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('user');
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(getUsers());
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      setMsg({ type: 'error', text: dict.fillAllFields });
      return;
    }

    const success = addUser({ username: newUsername, password: newPassword, role: newRole });
    if (success) {
      setMsg({ type: 'success', text: dict.userCreatedSuccess });
      setNewUsername('');
      setNewPassword('');
      loadUsers();
    } else {
      setMsg({ type: 'error', text: 'User already exists' });
    }
  };

  const handleDelete = (username: string) => {
    if (window.confirm(dict.deleteUserConfirm)) {
      if (deleteUser(username)) {
        loadUsers();
      } else {
        alert("Cannot delete admin");
      }
    }
  };

  return (
    <div className="p-4 sm:p-10 font-sans min-h-screen bg-gray-100 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {dict.backToCalculator}
        </button>

        <header className="mb-8 flex items-center">
          <div className="p-3 bg-blue-600 rounded-lg mr-4 shadow-lg text-white">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">{dict.manageUsersTitle}</h1>
            <p className="text-gray-600">Administrator Access</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* List Users */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Users</h2>
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.username} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${u.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                      {u.role === 'admin' ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{u.username}</div>
                      <div className="text-xs text-gray-500 uppercase">{u.role}</div>
                    </div>
                  </div>
                  {u.username !== 'admin' && (
                    <button
                      onClick={() => handleDelete(u.username)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-full transition"
                      title={dict.deleteButton}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add User Form */}
          <div className="bg-white rounded-xl shadow-lg p-6 h-fit border-t-4 border-green-600">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-green-600" />
              {dict.addUserTitle}
            </h2>
            
            {msg.text && (
              <div className={`mb-4 p-2 text-sm rounded ${msg.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{dict.usernameLabel}</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{dict.passwordLabel}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{dict.roleLabel}</label>
                <select 
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as Role)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition"
              >
                {dict.createUserButton}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;