import axios from "axios"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/auth"

const Modal = ({ show, children }: { show: boolean; children: React.ReactNode }) => {
    if (!show) return null
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative">
                {children}
            </div>
        </div>
    )
}

const Spinner = () => (
    <svg className="animate-spin h-8 w-8 text-white drop-shadow-[0_0_8px_#fff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
)

const Login = () => {
    const [form, setForm] = useState({password: "", email: ""})
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const {setUser} = useAuth()

    const navigate = useNavigate()
    const home = () => {
        navigate('/home')
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target
        setForm(prev => ({
            ...prev,
            [name]: value,
        }))
        // Clear error when user starts typing
        if (error) setError("")
    }

    const handleSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")
        setSuccess(false)

        try {
            const response = await axios.post(`http://localhost:3000/login`, form, {
                withCredentials: true
            })
            
            setUser(response.data.user)
            setSuccess(true)
            
            setTimeout(() => {
                if (response.data) {
                    home()
                }
            }, 1500)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (erro: any) {
            console.log(erro)
            const errorMessage = erro.response?.data?.message || erro.message || "Login failed. Please try again."
            setError(errorMessage)
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 transform translate-x-full animate-pulse"></div>
                    
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                        <p className="text-gray-400 text-sm">Sign in to your account</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                                Email Address
                            </label>
                            <div className="relative">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all duration-200 backdrop-blur-sm"
                                    placeholder="Enter your email"
                                    required
                                    disabled={isLoading}
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all duration-200 backdrop-blur-sm"
                                    placeholder="Enter your password"
                                    required
                                    disabled={isLoading}
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full relative overflow-hidden bg-white text-black font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:bg-gray-100 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="relative z-10">
                                {isLoading ? "Signing In..." : "Sign In"}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-gray-500 text-sm">
                            Don't have an account?{' '}
                            <a href="#" className="text-white hover:text-gray-300 transition-colors font-medium">
                                Sign up
                            </a>
                        </p>
                    </div>
                </div>

                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm"></div>
            </div>

            {/* Loading Modal */}
            <Modal show={isLoading && !error && !success}>
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-black via-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl">
                    <div className="mb-4">
                        <Spinner />
                    </div>
                    <span className="text-white font-semibold text-lg tracking-wide drop-shadow-[0_0_8px_#fff]">
                        Login in progress...
                    </span>
                </div>
            </Modal>

            {/* Success Modal */}
            <Modal show={success}>
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-900 via-green-800 to-green-700 rounded-2xl shadow-2xl border border-green-400/20 backdrop-blur-xl">
                    <div className="mb-4">
                        <svg className="h-10 w-10 text-green-400 drop-shadow-[0_0_8px_#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span className="text-white font-semibold text-lg tracking-wide drop-shadow-[0_0_8px_#4ade80]">
                        Login successful!
                    </span>
                </div>
            </Modal>

            {/* Error Modal */}
            <Modal show={!!error}>
                <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-900 via-red-800 to-red-700 rounded-2xl shadow-2xl border border-red-400/20 backdrop-blur-xl max-w-md mx-4">
                    <div className="mb-4">
                        <svg className="h-10 w-10 text-red-400 drop-shadow-[0_0_8px_#f87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <span className="text-white font-semibold text-lg tracking-wide drop-shadow-[0_0_8px_#f87171] text-center mb-4">
                        Login Failed
                    </span>
                    <p className="text-red-200 text-sm text-center mb-4">
                        {error}
                    </p>
                    <button
                        onClick={() => setError("")}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </Modal>
        </div>
    )
}

export default Login