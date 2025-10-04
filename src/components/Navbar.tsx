import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import Modal from '@/components/Modal'
import { confirm } from '@/components/Confirm'
import { User } from '@/types'

type Props = { user: User | null, setUser: (u: User | null) => void }

const Navbar: React.FC<Props> = ({ user, setUser }) => {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)

  const [currPw, setCurrPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const logout = async () => {
    if (!(await confirm('Are you sure you want to log out?'))) return
    await supabase.auth.signOut()
    setUser(null)
    navigate('/')
  }

  const resetPwForm = () => {
    setCurrPw('')
    setNewPw('')
    setNewPw2('')
  }

  // === Change Password Logic (no bcryptjs) ===
  const changePassword = async () => {
    if (!user) return
    if (!currPw.trim() || !newPw.trim() || !newPw2.trim()) {
      alert('Please fill in all fields.')
      return
    }
    if (newPw.length < 8) {
      alert('New password must be at least 8 characters.')
      return
    }
    if (newPw !== newPw2) {
      alert('Passwords do not match.')
      return
    }

    setPwLoading(true)
    try {
      const { data: row, error } = await supabase
        .from('users')
        .select('id, password')
        .eq('id', user.id)
        .single()

      if (error || !row) throw new Error(error?.message || 'User not found')

      if (row.password !== currPw) {
        alert('Current password is incorrect.')
        return
      }

      const { error: upErr } = await supabase
        .from('users')
        .update({ password: newPw })
        .eq('id', user.id)

      if (upErr) throw new Error(upErr.message)

      alert('Password updated successfully.')
      setPwOpen(false)
      resetPwForm()
    } catch (e: any) {
      alert('Error updating password: ' + (e?.message || e))
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <span className="nav-title">Class Settings</span>
        </div>

        {!isMobile ? (
          <div className="nav-links">
            <Link to="/check-class" className="nav-link">Check Class Setting</Link>
            {user?.role === 'Instructor' && (
              <Link to="/my-classes" className="nav-link">My Classes</Link>
            )}

            <div className="nav-dropdown">
              <button
                className="nav-link"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                More ▾
              </button>
              {menuOpen && (
                <div
                  className="dropdown-menu"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  {(user?.role === 'super_admin' || user?.role === 'admin') && (
                    <>
                      <Link to="/manage-users" className="dropdown-item">Manage Users</Link>
                      <Link to="/modify-class" className="dropdown-item">Modify Class</Link>
                    </>
                  )}
                  <Link to="/manage-class" className="dropdown-item">Manage Class</Link>
                  <Link to="/manage-props" className="dropdown-item">Manage Props</Link>
                  <button className="dropdown-item" onClick={logout}>Log out</button>
                </div>
              )}
            </div>

            {user && (
              <button
                className="nav-link"
                style={{ marginLeft: 12 }}
                onClick={() => setPwOpen(true)}
              >
                {user.display_name || user.username}
              </button>
            )}
          </div>
        ) : (
          <div className="nav-links">
            <div className="nav-dropdown">
              <button
                className="nav-link"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                ☰ Menu
              </button>
              {menuOpen && (
                <div
                  className="dropdown-menu"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link to="/check-class" className="dropdown-item">Check Class Setting</Link>
                  {user?.role === 'Instructor' && (
                    <Link to="/my-classes" className="dropdown-item">My Classes</Link>
                  )}
                  <Link to="/manage-class" className="dropdown-item">Manage Class</Link>
                  {(user?.role === 'super_admin' || user?.role === 'admin') && (
                    <>
                      <Link to="/manage-users" className="dropdown-item">Manage Users</Link>
                      <Link to="/modify-class" className="dropdown-item">Modify Class</Link>
                    </>
                  )}
                  <Link to="/manage-props" className="dropdown-item">Manage Props</Link>
                  <button className="dropdown-item" onClick={() => setPwOpen(true)}>
                    {user?.display_name || user?.username} (Change Password)
                  </button>
                  <button className="dropdown-item" onClick={logout}>Log out</button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* === Modal: Change Password === */}
      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change Password"
        footer={
          <>
            <button className="btn" onClick={() => setPwOpen(false)}>Cancel</button>
            <button className="btn primary" disabled={pwLoading} onClick={changePassword}>
              {pwLoading ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="grid grid-1" style={{ gap: 12 }}>
          <div>
            <label>Current Password</label>
            <input
              type="password"
              className="input"
              value={currPw}
              onChange={e => setCurrPw(e.target.value)}
            />
          </div>
          <div>
            <label>New Password</label>
            <input
              type="password"
              className="input"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
            />
          </div>
          <div>
            <label>Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={newPw2}
              onChange={e => setNewPw2(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}

export default Navbar
