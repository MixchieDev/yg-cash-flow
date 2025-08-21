export const debugAuth = () => {
  const authStorage = localStorage.getItem('auth-storage')
  console.log('Auth Storage Raw:', authStorage)
  
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage)
      console.log('Auth Storage Parsed:', parsed)
      console.log('Token from state:', parsed.state?.token)
      console.log('Token direct:', parsed.token)
    } catch (error) {
      console.error('Error parsing auth storage:', error)
    }
  }
}