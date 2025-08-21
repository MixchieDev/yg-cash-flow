import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../stores/authStore'
import { User } from '../types'

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<User>>({
    defaultValues: {
      email: user?.email || '',
      username: user?.username || '',
      full_name: user?.full_name || '',
    }
  })

  const onSubmit = async (data: Partial<User>) => {
    try {
      setError('')
      setMessage('')
      
      // TODO: Add API call to update user profile
      // For now, just update local state
      if (user) {
        const updatedUser = { ...user, ...data }
        setUser(updatedUser)
        setMessage('Profile updated successfully!')
        setIsEditing(false)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile')
    }
  }

  const handleCancel = () => {
    reset({
      email: user?.email || '',
      username: user?.username || '',
      full_name: user?.full_name || '',
    })
    setIsEditing(false)
    setError('')
    setMessage('')
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              User Profile
            </h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit Profile
              </button>
            )}
          </div>

          {message && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                {...register('username', { required: 'Username is required' })}
                type="text"
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                {...register('full_name')}
                type="text"
                disabled={!isEditing}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Account Information</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Account Status: <span className="font-medium text-green-600">Active</span></p>
                <p>Member Since: {new Date(user.created_at).toLocaleDateString()}</p>
                <p>Last Updated: {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Never'}</p>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-white shadow rounded-lg mt-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Change Password
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Update your password to keep your account secure.
          </p>
          <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
            Change Password
          </button>
        </div>
      </div>
    </div>
  )
}