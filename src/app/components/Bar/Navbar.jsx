import React from 'react'
import ThemeSwitcher from '../ThemeSwitcher'

export default function Navbar() {
  return (
    <nav>
        <div className="flex justify-between items-center p-4">
            <h1 className='text-2xl font-bold'>Rival Radar </h1>
            <ThemeSwitcher />
        </div>
    </nav>
  )
}
