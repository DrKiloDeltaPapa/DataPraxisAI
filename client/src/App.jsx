import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Blog from './pages/Blog'
import Admin from './pages/Admin'

const App = () => {
  return (                    
    <div>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/blog' element={<Blog />} />
        {/* detail route for individual blog posts */}
        <Route path='/blog/:id' element={<Blog />} />
        <Route path='/admin' element={<Admin />} />
      </Routes>
    </div>
  )
}

export default App

