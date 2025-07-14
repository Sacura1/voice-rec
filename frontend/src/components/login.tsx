import axios from "axios"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const Login = () => {
  const [form,setForm] = useState({password:"",email:""})

  const navigate = useNavigate()
  const home = () => {
    navigate('/home')
  }



    const handleChange = (e: React.ChangeEvent<HTMLInputElement>)  => {
        const {name, value} = e.target
        setForm(prev=>({
            ...prev,
            [name]:value,

        }
        ))
    }
      const handleSubmit = async (  e: { preventDefault: () => void }) => {
        e.preventDefault()

        try {
        const   response  = await axios.post('http://localhost:3000/login', form,{
            withCredentials:true
        })
        console.log(response.data.user.username)
        if (response.data){
            home()
        }

        } catch (erro) {
            console.log(erro)
        }
        console.log(form)
    }


    return(
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
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="w-full relative overflow-hidden bg-white text-black font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:bg-gray-100 active:scale-95 group"
                        >
                            <span className="relative z-10">Sign In</span>
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
        </div>
    )
}

export default Login