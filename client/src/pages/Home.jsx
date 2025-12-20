import React from 'react'
import Navbar from '../components/Navbar'
import Header from '../components/Header'
import BlogList from './BlogList'

const Home = () => {
  return (
    <>
      <Navbar/>
      <Header/>
      <BlogList />
    </>
  )
}

export default Home
