/*
  Climb Club - Web-hosted app with API backend
  Data model stored in server database.
*/

;(function () {
  console.log('JavaScript file loaded!')
  
  // Admin authentication - CHANGE THIS IN PRODUCTION!
  const adminPassword = window.ADMIN_PASSWORD || 'bulldok2025' // Change this to a secure password
  let isAdminLoggedIn = false
  
  function checkAdminStatus() {
    // Check if admin is logged in (session storage for this session only)
    isAdminLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true'
    updateAdminUI()
  }
  
  function loginAdmin(password) {
    if (password === adminPassword) {
      isAdminLoggedIn = true
      sessionStorage.setItem('adminLoggedIn', 'true')
      updateAdminUI()
      return true
    }
    return false
  }
  
  function logoutAdmin() {
    isAdminLoggedIn = false
    sessionStorage.removeItem('adminLoggedIn')
    updateAdminUI()
  }
  
  function updateAdminUI() {
    const adminBtn = document.getElementById('adminLoginBtn')
    const adminStatus = document.getElementById('adminStatus')
    const sessionForm = document.getElementById('sessionForm')
    const sessionAdminRequired = document.getElementById('sessionAdminRequired')
    const ioContent = document.getElementById('ioContent')
    const ioAdminRequired = document.getElementById('ioAdminRequired')
    
    if (isAdminLoggedIn) {
      adminBtn.classList.remove('border-gray-200', 'dark:border-gray-800', 'hover:bg-gray-100', 'dark:hover:bg-gray-900')
      adminBtn.classList.add('bg-green-100', 'dark:bg-green-900', 'border-green-300', 'dark:border-green-700', 'text-green-700', 'dark:text-green-300')
      adminStatus.textContent = 'Admin (Logg ut)'
      adminBtn.title = 'Du er logget inn som admin. Klikk for å logge ut.'
      
      // Show protected content
      if (sessionForm && sessionAdminRequired) {
        sessionForm.classList.remove('hidden')
        sessionAdminRequired.classList.add('hidden')
      }
      if (ioContent && ioAdminRequired) {
        ioContent.classList.remove('hidden')
        ioAdminRequired.classList.add('hidden')
      }
    } else {
      adminBtn.classList.remove('bg-green-100', 'dark:bg-green-900', 'border-green-300', 'dark:border-green-700', 'text-green-700', 'dark:text-green-300')
      adminBtn.classList.add('border-gray-200', 'dark:border-gray-800', 'hover:bg-gray-100', 'dark:hover:bg-gray-900')
      adminStatus.textContent = 'Logg inn som admin'
      adminBtn.title = 'Klikk for å logge inn som admin'
      
      // Hide protected content
      if (sessionForm && sessionAdminRequired) {
        sessionForm.classList.add('hidden')
        sessionAdminRequired.classList.remove('hidden')
      }
      if (ioContent && ioAdminRequired) {
        ioContent.classList.add('hidden')
        ioAdminRequired.classList.remove('hidden')
      }
    }
  }
  
  function requireAdmin(action) {
    if (!isAdminLoggedIn) {
      alert(`Du må være logget inn som admin for å ${action}.`)
      return false
    }
    return true
  }

  // API functions with better error handling
  const api = {
    async get(endpoint) {
      try {
        const response = await fetch(`/api${endpoint}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.json()
      } catch (error) {
        console.error(`API GET ${endpoint} failed:`, error)
        throw new Error(`Failed to fetch ${endpoint.replace('/api', '')}: ${error.message}`)
      }
    },
    
    async post(endpoint, data) {
      try {
        const response = await fetch(`/api${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.json()
      } catch (error) {
        console.error(`API POST ${endpoint} failed:`, error)
        throw new Error(`Failed to create ${endpoint.replace('/api/', '')}: ${error.message}`)
      }
    },
    
    async put(endpoint, data) {
      try {
        const response = await fetch(`/api${endpoint}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.json()
      } catch (error) {
        console.error(`API PUT ${endpoint} failed:`, error)
        throw new Error(`Failed to update ${endpoint.replace('/api/', '')}: ${error.message}`)
      }
    },
    
    async delete(endpoint) {
      try {
        const response = await fetch(`/api${endpoint}`, {
          method: 'DELETE'
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return response.json()
      } catch (error) {
        console.error(`API DELETE ${endpoint} failed:`, error)
        throw new Error(`Failed to delete ${endpoint.replace('/api/', '')}: ${error.message}`)
      }
    }
  }

  // Loading state management
  function showLoading(message = 'Laster...') {
    const loadingEl = document.getElementById('loadingIndicator')
    if (loadingEl) {
      loadingEl.textContent = message
      loadingEl.classList.remove('hidden')
    }
  }

  function hideLoading() {
    const loadingEl = document.getElementById('loadingIndicator')
    if (loadingEl) {
      loadingEl.classList.add('hidden')
    }
  }

  // Helper function to show form validation error
  function showFormError(message, formElement) {
    let errorEl = formElement.querySelector('.form-error')
    if (!errorEl) {
      errorEl = document.createElement('div')
      errorEl.className = 'form-error text-red-500 text-sm mt-2 p-2 bg-red-50 dark:bg-red-950 rounded'
      formElement.insertBefore(errorEl, formElement.firstChild)
    }
    errorEl.textContent = message
    setTimeout(() => errorEl.remove(), 5000)
  }

  // Global data cache
  let globalData = {
    members: [],
    sessions: [],
    attendance: {},
    _seq: 1
  }

  // Database functions
  const db = {
    async load() {
      try {
        showLoading('Laster data fra server...')
        globalData = await api.get('/data')
        
        // Validate and ensure data structure
        if (!globalData || typeof globalData !== 'object') {
          throw new Error('Invalid data structure received from server')
        }
        
        this.ensure()
        return globalData
      } catch (error) {
        console.error('Failed to load data:', error)
        throw error
      } finally {
        hideLoading()
      }
    },
    
    get() {
      return globalData
    },
    
    async save() {
      try {
        await api.put('/data', globalData)
      } catch (error) {
        console.error('Failed to save data:', error)
        throw error
      }
    },
    
    ensure() {
      if (!globalData.members) globalData.members = []
      if (!globalData.sessions) globalData.sessions = []
      if (!globalData.attendance) globalData.attendance = {}
      if (!globalData._seq) globalData._seq = 1
      return globalData
    },
    
    async id() {
      const id = globalData._seq
      globalData._seq += 1
      await this.save() // Save the updated sequence
      return String(id)
    }
  }

  const state = {
    view: 'register',
    selectedMember: null,
    myAttendanceSelectedMember: null,
    filter: {
      sessionQuery: '',
      sessionDiscipline: 'all',
      memberQuery: '',
      registerQuery: '',
      myAttendanceQuery: '',
      myAttendanceFilter: 'all' // all, registered, attended, missed
    }
  }

  // Utility functions
  const $ = document.querySelector.bind(document)
  const $$ = document.querySelectorAll.bind(document)

  // Theme handling
  function initTheme() {
    const stored = localStorage.theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored === 'dark' || (!stored && prefersDark)
    document.documentElement.classList.toggle('dark', dark)
  }

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle('dark')
    localStorage.theme = dark ? 'dark' : 'light'
  }

  // Tab system - setup after DOM is ready
  function setupTabs() {
    console.log('Setting up tabs...')
    const tabButtons = $$('[data-tab]')
    console.log('Found tab buttons:', tabButtons.length)
    
    // Tab system
    tabButtons.forEach(btn => {
      console.log('Setting up tab button:', btn.dataset.tab)
      btn.addEventListener('click', () => {
        console.log('Tab clicked:', btn.dataset.tab)
        const id = btn.dataset.tab
        state.view = id
        $$('.view').forEach(v => v.classList.add('hidden'))
        $('#view-' + id).classList.remove('hidden')
        $$('.tab-btn').forEach(b => b.dataset.active = 'false')
        btn.dataset.active = 'true'
        if (id === 'myattendance') populateMyAttendanceMemberSelect()
        if (id === 'reports') refreshReports()
      })
    })
    // set initial tab active
    const initialTab = $('[data-tab="register"]')
    if (initialTab) {
      initialTab.dataset.active = 'true'
      console.log('Initial tab set to register')
    }
    console.log('Tabs setup complete')
  }

  // Event listeners - setup after DOM is ready
  function setupEventListeners() {
    console.log('Setting up event listeners...')
    
    // Theme toggle
    const themeBtn = $('#themeToggle')
    console.log('Theme button found:', themeBtn)
    if (themeBtn) {
      themeBtn.addEventListener('click', toggleTheme)
      console.log('Theme button listener attached')
    }
    
    // Tab system
    setupTabs()
    
    // Admin login button
    const adminBtn = $('#adminLoginBtn')
    console.log('Admin button found:', adminBtn)
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        console.log('Admin button clicked!')
        if (isAdminLoggedIn) {
          logoutAdmin()
        } else {
          $('#adminLoginDialog').showModal()
          $('#adminPasswordInput').focus()
        }
      })
      console.log('Admin button listener attached')
    }
    
    // Admin login form
    const adminForm = $('#adminLoginForm')
    console.log('Admin form found:', adminForm)
    if (adminForm) {
      adminForm.addEventListener('submit', e => {
        e.preventDefault()
        console.log('Admin form submitted')
        const password = $('#adminPasswordInput').value
        if (loginAdmin(password)) {
          $('#adminLoginDialog').close()
          $('#adminPasswordInput').value = ''
          $('#adminLoginError').textContent = ''
        } else {
          $('#adminLoginError').textContent = 'Feil passord'
        }
      })
      console.log('Admin form listener attached')
    }
    
    console.log('Event listeners setup complete')
  }

  // Forms - Session form
  $('#sessionForm').addEventListener('submit', async e => {
    e.preventDefault()
    if (!requireAdmin('create session')) return
    
    try {
      const form = e.currentTarget
      const fd = new FormData(form)
      const session = {
        date: fd.get('date'),
        location: fd.get('location').trim(),
        start: fd.get('start'),
        end: fd.get('end'),
        discipline: fd.get('discipline'),
        capacity: Number(fd.get('capacity') || 0),
        notes: fd.get('notes').trim()
      }
      
      // Client-side validation
      if (!session.date) {
        showFormError('Dato er påkrevd', form)
        return
      }
      if (!session.location) {
        showFormError('Sted er påkrevd', form)
        return
      }
      if (!session.start) {
        showFormError('Starttid er påkrevd', form)
        return
      }
      if (!session.end) {
        showFormError('Sluttid er påkrevd', form)
        return
      }
      if (session.start >= session.end) {
        showFormError('Sluttid må være etter starttid', form)
        return
      }
      
      const editId = form.dataset.editId
      
      if (editId) {
        // Update existing session
        const updatedSession = await api.put(`/sessions/${editId}`, { ...session, id: editId })
        const sessionIndex = globalData.sessions.findIndex(s => s.id === editId)
        if (sessionIndex !== -1) {
          globalData.sessions[sessionIndex] = updatedSession
        }
        
        // Clear edit mode
        delete form.dataset.editId
        form.querySelector('button[type="submit"]').textContent = 'Legg til økt'
      } else {
        // Create new session
        const newSession = await api.post('/sessions', session)
        globalData.sessions.push(newSession)
      }
      
      e.currentTarget.reset()
      render()
    } catch (error) {
      console.error('Failed to save session:', error)
      alert('Failed to save session. Please try again.')
    }
  })

  $('#memberForm').addEventListener('submit', async e => {
    e.preventDefault()
    
    try {
      const form = e.currentTarget
      const fd = new FormData(form)
      const member = {
        name: fd.get('name').trim(),
        email: fd.get('email').trim(),
        belay: !!fd.get('belay'),
        emergency: fd.get('emergency').trim(),
        notes: fd.get('notes').trim(),
        pr: (fd.get('pr') || '').trim()
      }
      
      // Client-side validation
      if (!member.name) {
        showFormError('Navn er påkrevd', form)
        return
      }
      if (!member.email) {
        showFormError('E-post er påkrevd', form)
        return
      }
      // Basic email validation
      if (!/\S+@\S+\.\S+/.test(member.email)) {
        showFormError('Ugyldig e-postadresse', form)
        return
      }
      
      const editId = form.dataset.editId
      
      if (editId) {
        // Update existing member
        const updatedMember = await api.put(`/members/${editId}`, { ...member, id: editId })
        const memberIndex = globalData.members.findIndex(m => m.id === editId)
        if (memberIndex !== -1) {
          globalData.members[memberIndex] = updatedMember
        }
        
        // Clear edit mode
        delete form.dataset.editId
        form.querySelector('button[type="submit"]').textContent = 'Legg til medlem'
      } else {
        // Create new member
        const newMember = await api.post('/members', member)
        globalData.members.push(newMember)
      }
      
      e.currentTarget.reset()
      render()
    } catch (error) {
      console.error('Failed to save member:', error)
      alert('Failed to save member. Please try again.')
    }
  })

  // Filters
  $('#sessionSearch').addEventListener('input', e => {
    state.filter.sessionQuery = e.currentTarget.value.toLowerCase()
    renderSessions()
  })
  $('#sessionFilter').addEventListener('change', e => {
    state.filter.sessionDiscipline = e.currentTarget.value
    renderSessions()
  })
  $('#memberSearch').addEventListener('input', e => {
    state.filter.memberQuery = e.currentTarget.value.toLowerCase()
    renderMembers()
  })
  $('#registerSessionSearch').addEventListener('input', e => {
    state.filter.registerQuery = e.currentTarget.value.toLowerCase()
    renderRegisterSessions()
  })

  // Register section member search
  const memberSearchInput = $('#memberSearchInput')
  const memberDropdown = $('#memberDropdown')
  const memberList = $('#memberList')
  const selectedMemberInfo = $('#selectedMemberInfo')
  const selectedMemberName = $('#selectedMemberName')
  const selectedMemberDetails = $('#selectedMemberDetails')

  function renderMemberList(query) {
    const d = db.get()
    const filteredMembers = d.members
      .filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10) // Limit to 10 results
    
    memberList.innerHTML = filteredMembers
      .map(m => `
        <div class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer member-option" data-member-id="${m.id}">
          <div class="font-medium">${m.name}</div>
          <div class="text-sm text-gray-500">${m.belay ? 'Brattkort' : ''}</div>
        </div>
      `)
      .join('')
  }

  function populateMemberSelect() {
    renderMemberList('')
  }

  function selectMember(memberId) {
    const d = db.get()
    const member = d.members.find(m => m.id === memberId)
    
    if (member) {
      state.selectedMember = member
      memberSearchInput.value = member.name
      selectedMemberName.textContent = member.name
      selectedMemberDetails.textContent = `${member.pr ? `PR: ${member.pr}` : ''}${member.pr && member.belay ? ' • ' : ''}${member.belay ? 'Brattkort' : ''}`
      selectedMemberInfo.classList.remove('hidden')
      memberDropdown.classList.add('hidden')
    } else {
      state.selectedMember = null
      memberSearchInput.value = ''
      selectedMemberInfo.classList.add('hidden')
    }
    renderRegisterSessions()
  }

  // Member search event listeners
  memberSearchInput.addEventListener('input', e => {
    const query = e.target.value.trim()
    if (query.length > 0) {
      renderMemberList(query)
      memberDropdown.classList.remove('hidden')
    } else {
      memberDropdown.classList.add('hidden')
      // If input is cleared, clear selection
      if (state.selectedMember) {
        state.selectedMember = null
        selectedMemberInfo.classList.add('hidden')
        renderRegisterSessions()
      }
    }
  })

  memberSearchInput.addEventListener('focus', e => {
    const query = e.target.value.trim()
    if (query.length > 0) {
      renderMemberList(query)
      memberDropdown.classList.remove('hidden')
    }
  })

  memberList.addEventListener('click', e => {
    const memberOption = e.target.closest('.member-option')
    if (memberOption) {
      const memberId = memberOption.dataset.memberId
      selectMember(memberId)
    }
  })

  // Hide dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!memberSearchInput.contains(e.target) && !memberDropdown.contains(e.target)) {
      memberDropdown.classList.add('hidden')
    }
  })

  // Format helpers
  function fmtDate(d) {
    return new Date(d).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' })
  }
  function fmtTime(t) {
    return t.slice(0, 5)
  }
  function disciplineLabel(d) {
    return { 'Bouldering': 'Buldring', 'Top-rope': 'Topptau', 'Lead': 'Ledklatring', 'Strength/Conditioning': 'Styrketrening' }[d] || d
  }

  // Core render function
  function render() {
    renderSessions()
    renderMembers()
    renderRegisterSessions()
    refreshAttendanceSessions()
    refreshReports()
  }

  function renderRegisterSessions() {
    const d = db.get()
    const list = $('#registerSessionsList')
    
    // Check if element exists
    if (!list) {
      return
    }
    
    const q = state.filter.registerQuery
    
    // Show future sessions only
    const today = new Date().toISOString().split('T')[0]
    const items = d.sessions
      .slice()
      .filter(s => s.date >= today) // Only future sessions
      .sort((a,b) => a.date.localeCompare(b.date))
      .filter(s => !q || [s.location, s.discipline, s.notes].join(' ').toLowerCase().includes(q))
      .map(s => {
        const cap = s.capacity || 0
        const att = d.attendance[s.id] || {}
        const regCount = Object.values(att).filter(x => x.registered).length
        const isFull = cap && regCount >= cap
        const isRegistered = state.selectedMember ? att[state.selectedMember.id]?.registered : false
        
        const canRegister = state.selectedMember && (!isFull || isRegistered)
        
        const registrationStatus = state.selectedMember 
          ? (isRegistered ? 'registered' : 'not-registered')
          : 'no-member-selected'
        
        return `<div class="p-4 ${registrationStatus === 'registered' ? 'bg-green-50 dark:bg-green-950 border-l-4 border-green-500' : registrationStatus === 'not-registered' ? 'bg-gray-50 dark:bg-gray-900' : ''}">
          <div class="flex flex-col sm:flex-row sm:items-center gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <div class="font-semibold">${fmtDate(s.date)} · ${s.location}</div>
                ${state.selectedMember ? (isRegistered 
                  ? `<div class="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                      Påmeldt
                    </div>`
                  : `<div class="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                      </svg>
                      Ikke påmeldt
                    </div>`
                ) : ''}
              </div>
              <div class="text-sm text-gray-500">${disciplineLabel(s.discipline)} • ${fmtTime(s.start)}–${fmtTime(s.end)}</div>
              ${s.notes ? `<div class="text-sm mt-1">${s.notes}</div>` : ''}
            </div>
            <div class="sm:text-right">
              <div class="text-sm">Påmeldt: <strong>${regCount}</strong>${cap ? ` / ${cap}` : ''}</div>
              ${isFull && !isRegistered ? '<div class="text-xs text-red-600 mt-1">Fullt</div>' : ''}
              ${state.selectedMember ? `
                <div class="flex gap-2 mt-2 justify-end">
                  ${isRegistered 
                    ? `<button class="btn-danger" data-unregister="${s.id}">Meld av</button>`
                    : `<button class="btn-primary ${!canRegister ? 'opacity-50 cursor-not-allowed' : ''}" data-register="${s.id}" ${!canRegister ? 'disabled' : ''}>Meld på</button>`
                  }
                </div>
              ` : `
                <div class="text-xs text-gray-500 mt-2">Velg medlem for å melde på</div>
              `}
            </div>
          </div>
        </div>`
      })
      .join('')
    
    list.innerHTML = items || '<div class="p-8 text-center text-gray-500">Ingen tilgjengelige økter</div>'
  }

  // Registration handlers
  $('#registerSessionsList').addEventListener('click', async e => {
    const registerBtn = e.target.closest('[data-register]')
    if (registerBtn) {
      if (!state.selectedMember) return
      
      try {
        const sessionId = registerBtn.dataset.register
        await api.put(`/attendance/${sessionId}/${state.selectedMember.id}`, {
          registered: true,
          attended: false,
          notes: ''
        })
        
        // Update global data
        if (!globalData.attendance[sessionId]) {
          globalData.attendance[sessionId] = {}
        }
        globalData.attendance[sessionId][state.selectedMember.id] = {
          registered: true,
          attended: false,
          notes: ''
        }
        
        renderRegisterSessions()
      } catch (error) {
        console.error('Failed to register:', error)
        alert('Failed to register. Please try again.')
      }
      return
    }

    const unregisterBtn = e.target.closest('[data-unregister]')
    if (unregisterBtn) {
      if (!state.selectedMember) return
      
      try {
        const sessionId = unregisterBtn.dataset.unregister
        await api.delete(`/attendance/${sessionId}/${state.selectedMember.id}`)
        
        // Update global data
        if (globalData.attendance[sessionId]) {
          delete globalData.attendance[sessionId][state.selectedMember.id]
        }
        
        renderRegisterSessions()
      } catch (error) {
        console.error('Failed to unregister:', error)
        alert('Failed to unregister. Please try again.')
      }
      return
    }
  })

  // Attendance
  const attendanceSessionSelect = $('#attendanceSessionSelect')
  const attendanceEmpty = $('#attendanceEmpty')
  const attendanceTableWrap = $('#attendanceTableWrap')
  const attendanceTable = $('#attendanceTable')

  function refreshAttendanceSessions() {
    const d = db.get()
    attendanceSessionSelect.innerHTML = ''
    d.sessions
      .slice()
      .sort((a,b) => a.date.localeCompare(b.date))
      .forEach(s => {
        const opt = document.createElement('option')
        opt.value = s.id
        opt.textContent = `${fmtDate(s.date)} · ${s.location} · ${disciplineLabel(s.discipline)}`
        attendanceSessionSelect.appendChild(opt)
      })
    if (d.sessions.length) {
      attendanceEmpty.classList.add('hidden')
      attendanceTableWrap.classList.remove('hidden')
      if (!attendanceSessionSelect.value && d.sessions[0]) attendanceSessionSelect.value = d.sessions[0].id
      renderAttendance()
    } else {
      attendanceEmpty.classList.remove('hidden')
      attendanceTableWrap.classList.add('hidden')
    }
  }

  attendanceSessionSelect.addEventListener('change', renderAttendance)

  function renderAttendance() {
    const d = db.get()
    const sid = attendanceSessionSelect.value
    const session = d.sessions.find(s => s.id === sid)
    if (!session) return
    const att = d.attendance[sid] || {}
    const rows = Object.entries(att)
      .map(([mid, rec]) => {
        const m = d.members.find(m => m.id === mid)
        if (!m) return ''
        return `<tr data-mid="${mid}">
          <td class="py-2 pr-4">
            <div class="font-medium">${m.name}</div>
          </td>
          <td class="py-2 pr-4"><input type="checkbox" data-field="registered" ${rec.registered ? 'checked' : ''} class="checkbox"></td>
          <td class="py-2 pr-4"><input type="checkbox" data-field="attended" ${rec.attended ? 'checked' : ''} class="checkbox"></td>
          <td class="py-2 pr-4"><input type="text" data-field="notes" value="${rec.notes || ''}" class="border rounded px-2 py-1 text-sm w-full"></td>
          <td class="py-2"><button class="btn-danger btn-sm" data-remove="${mid}">Fjern</button></td>
        </tr>`
      })
      .filter(Boolean)
      .join('')
    attendanceTable.innerHTML = rows
  }

  $('#attendanceAddMemberBtn').addEventListener('click', () => openAddMemberDialog())
  $('#attendanceSaveBtn').addEventListener('click', () => saveAttendance())

  async function saveAttendance() {
    try {
      const d = db.get()
      const sid = attendanceSessionSelect.value
      const att = d.attendance[sid] || {}
      
      // Collect all attendance data from the form
      const attendancePromises = []
      $$('#attendanceTable tr').forEach(tr => {
        const mid = tr.dataset.mid
        const data = {
          registered: $('input[data-field="registered"]', tr).checked,
          attended: $('input[data-field="attended"]', tr).checked,
          notes: $('input[data-field="notes"]', tr).value.trim()
        }
        
        attendancePromises.push(
          api.put(`/attendance/${sid}/${mid}`, data)
        )
        
        // Update global data
        att[mid] = data
      })
      
      await Promise.all(attendancePromises)
      globalData.attendance[sid] = att
      
      refreshReports()
    } catch (error) {
      console.error('Failed to save attendance:', error)
      alert('Failed to save attendance. Please try again.')
    }
  }

  attendanceTable.addEventListener('click', async e => {
    const btn = e.target.closest('[data-remove]')
    if (!btn) return
    
    try {
      const tr = btn.closest('tr')
      const mid = tr.dataset.mid
      const sid = attendanceSessionSelect.value
      
      await api.delete(`/attendance/${sid}/${mid}`)
      
      // Update global data
      if (globalData.attendance[sid]) {
        delete globalData.attendance[sid][mid]
      }
      
      renderAttendance()
      refreshReports()
    } catch (error) {
      console.error('Failed to remove attendance:', error)
      alert('Failed to remove attendance. Please try again.')
    }
  })

  // Add Member Dialog
  const addMemberDialog = $('#addMemberDialog')
  const addMemberList = $('#addMemberList')
  const addMemberSearch = $('#addMemberSearch')

  function openAddMemberDialog() {
    addMemberSearch.value = ''
    renderAddMemberList()
    addMemberDialog.showModal()
  }

  addMemberSearch.addEventListener('input', renderAddMemberList)
  $$("[data-close-dialog]").forEach(b => b.addEventListener('click', () => addMemberDialog.close()))

  addMemberList.addEventListener('click', async e => {
    const btn = e.target.closest('[data-add]')
    if (!btn) return
    
    try {
      const mid = btn.dataset.mid
      const sid = attendanceSessionSelect.value
      
      await api.put(`/attendance/${sid}/${mid}`, {
        registered: true,
        attended: false,
        notes: ''
      })
      
      // Update global data
      if (!globalData.attendance[sid]) {
        globalData.attendance[sid] = {}
      }
      globalData.attendance[sid][mid] = {
        registered: true,
        attended: false,
        notes: ''
      }
      
      renderAttendance()
      addMemberDialog.close()
      refreshReports()
    } catch (error) {
      console.error('Failed to add member to attendance:', error)
      alert('Failed to add member to attendance. Please try again.')
    }
  })

  function renderAddMemberList() {
    const d = db.get()
    const sid = attendanceSessionSelect.value
    const att = d.attendance[sid] || {}
    const q = addMemberSearch.value.toLowerCase()
    const available = d.members
      .filter(m => !(m.id in att))
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .slice(0, 10)
    
    addMemberList.innerHTML = available
      .map(m => `
        <div class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" data-add data-mid="${m.id}">
          <div class="font-medium">${m.name}</div>
          <div class="text-sm text-gray-500">${m.belay ? 'Brattkort' : ''}</div>
        </div>
      `)
      .join('')
  }

  // Lists
  function renderSessions() {
    const d = db.get()
    const list = $('#sessionsList')
    const q = state.filter.sessionQuery
    const disc = state.filter.sessionDiscipline
    const items = d.sessions
      .slice()
      .sort((a,b) => a.date.localeCompare(b.date))
      .filter(s => !q || [s.location, s.discipline, s.notes].join(' ').toLowerCase().includes(q))
      .filter(s => disc === 'all' || s.discipline === disc)
      .map(s => {
        const cap = s.capacity || 0
        const att = d.attendance[s.id] || {}
        const regCount = Object.values(att).filter(x => x.registered).length
        const attCount = Object.values(att).filter(x => x.attended).length
        const occupancy = cap ? Math.round((regCount / cap) * 100) : 0
        return `<div class="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex-1">
            <div class="font-semibold">${fmtDate(s.date)} · ${s.location}</div>
            <div class="text-sm text-gray-500">${disciplineLabel(s.discipline)} • ${fmtTime(s.start)}–${fmtTime(s.end)}</div>
            ${s.notes ? `<div class="text-sm mt-1">${s.notes}</div>` : ''}
          </div>
          <div class="sm:text-right">
            <div class="text-sm">Påmeldt: <strong>${regCount}</strong> · Møtte: <strong>${attCount}</strong>${cap ? ` · Kap: ${cap} (${occupancy}%)` : ''}</div>
            ${isAdminLoggedIn ? `
              <div class="flex gap-2 mt-2 justify-end">
                <button class="btn-secondary" data-edit-session="${s.id}">Rediger</button>
                <button class="btn-danger" data-delete-session="${s.id}">Slett</button>
              </div>
            ` : `
              <div class="flex gap-2 mt-2 justify-end">
                <button class="btn-secondary" data-view-session="${s.id}">Se detaljer</button>
              </div>
            `}
          </div>
        </div>`
      })
      .join('')
    list.innerHTML = items || '<div class="p-8 text-center text-gray-500">Ingen økter funnet</div>'
  }

  function renderMembers() {
    const d = db.get()
    const list = $('#membersList')
    const q = state.filter.memberQuery
    const items = d.members
      .slice()
      .sort((a,b) => a.name.localeCompare(b.name))
      .filter(m => !q || (m.name + ' ' + (m.email||'')).toLowerCase().includes(q))
      .map(m => {
        const sessionsCount = Object.values(d.attendance).filter(att => m.id in att).length
        const attendedCount = Object.values(d.attendance).reduce((sum, att) => sum + (att[m.id]?.attended ? 1 : 0), 0)
        return `<div class="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex-1">
            <div class="font-semibold">${m.name}</div>
            <div class="text-sm text-gray-500">${m.belay ? 'Brattkort' : ''}</div>
            <div class="text-sm">${m.email || ''}</div>
            ${m.pr ? `<div class="text-sm font-medium">PR: ${m.pr}</div>` : ''}
            ${m.notes ? `<div class="text-sm mt-1 italic">${m.notes}</div>` : ''}
          </div>
          <div class="sm:text-right">
            <div class="text-sm">Påmeldt: <strong>${sessionsCount}</strong> · Møtte: <strong>${attendedCount}</strong></div>
            ${isAdminLoggedIn ? `
              <div class="flex gap-2 mt-2 justify-end">
                <button class="btn-secondary" data-edit-member="${m.id}">Rediger</button>
                <button class="btn-secondary" data-set-pr="${m.id}">Sett PR</button>
                <button class="btn-danger" data-delete-member="${m.id}">Slett</button>
              </div>
            ` : `
              <div class="flex gap-2 mt-2 justify-end">
                <button class="btn-secondary" data-view-member="${m.id}">Se detaljer</button>
              </div>
            `}
          </div>
        </div>`
      })
      .join('')
    list.innerHTML = items || '<div class="p-8 text-center text-gray-500">Ingen medlemmer funnet</div>'
  }

  // Delete handlers
  $('#sessionsList').addEventListener('click', async e => {
    const del = e.target.closest('[data-delete-session]')
    if (del) {
      if (!requireAdmin('delete session')) return
      
      try {
        const id = del.dataset.deleteSession
        const d = db.get()
        const session = d.sessions.find(s => s.id === id)
        if (session && confirm(`Er du sikker på at du vil slette økten "${fmtDate(session.date)} · ${session.location}"? Dette kan ikke angres.`)) {
          await api.delete(`/sessions/${id}`)
          
          // Update global data
          globalData.sessions = globalData.sessions.filter(s => s.id !== id)
          delete globalData.attendance[id]
          
          render()
        }
      } catch (error) {
        console.error('Failed to delete session:', error)
        alert('Failed to delete session. Please try again.')
      }
      return
    }

    const edit = e.target.closest('[data-edit-session]')
    if (edit) {
      if (!requireAdmin('edit session')) return
      const id = edit.dataset.editSession
      const d = db.get()
      const session = d.sessions.find(s => s.id === id)
      if (!session) return
      
      // Fill form for editing
      $('#sessionForm [name="date"]').value = session.date
      $('#sessionForm [name="location"]').value = session.location
      $('#sessionForm [name="start"]').value = session.start
      $('#sessionForm [name="end"]').value = session.end
      $('#sessionForm [name="discipline"]').value = session.discipline
      $('#sessionForm [name="capacity"]').value = session.capacity || ''
      $('#sessionForm [name="notes"]').value = session.notes || ''
      
      // Add edit mode
      const form = $('#sessionForm')
      form.dataset.editId = id
      const submitBtn = form.querySelector('button[type="submit"]')
      submitBtn.textContent = 'Oppdater økt'
      
      // Add cancel button if it doesn't exist
      let cancelBtn = form.querySelector('.cancel-edit-btn')
      if (!cancelBtn) {
        cancelBtn = document.createElement('button')
        cancelBtn.type = 'button'
        cancelBtn.className = 'btn-secondary cancel-edit-btn'
        cancelBtn.textContent = 'Avbryt'
        cancelBtn.addEventListener('click', () => {
          form.reset()
          delete form.dataset.editId
          submitBtn.textContent = 'Legg til økt'
          cancelBtn.remove()
        })
        submitBtn.parentNode.appendChild(cancelBtn)
      }
      
      // Scroll to form
      form.scrollIntoView({ behavior: 'smooth' })
      return
    }
  })

  $('#membersList').addEventListener('click', async e => {
    const del = e.target.closest('[data-delete-member]')
    if (del) {
      if (!requireAdmin('delete member')) return
      
      try {
        const id = del.dataset.deleteMember
        const d = db.get()
        const member = d.members.find(m => m.id === id)
        if (member && confirm(`Er du sikker på at du vil slette medlemmet "${member.name}"? Dette kan ikke angres.`)) {
          await api.delete(`/members/${id}`)
          
          // Update global data
          globalData.members = globalData.members.filter(m => m.id !== id)
          Object.keys(globalData.attendance).forEach(sessionId => {
            delete globalData.attendance[sessionId][id]
          })
          
          render()
        }
      } catch (error) {
        console.error('Failed to delete member:', error)
        alert('Failed to delete member. Please try again.')
      }
      return
    }

    const edit = e.target.closest('[data-edit-member]')
    if (edit) {
      if (!requireAdmin('edit member')) return
      const id = edit.dataset.editMember
      const d = db.get()
      const member = d.members.find(m => m.id === id)
      if (!member) return
      
      // Fill form for editing
      $('#memberForm [name="name"]').value = member.name
      $('#memberForm [name="email"]').value = member.email
      $('#memberForm [name="belay"]').checked = member.belay
      $('#memberForm [name="emergency"]').value = member.emergency
      $('#memberForm [name="notes"]').value = member.notes || ''
      $('#memberForm [name="pr"]').value = member.pr || ''
      
      // Add edit mode
      const form = $('#memberForm')
      form.dataset.editId = id
      const submitBtn = form.querySelector('button[type="submit"]')
      submitBtn.textContent = 'Oppdater medlem'
      
      // Add cancel button if it doesn't exist
      let cancelBtn = form.querySelector('.cancel-edit-btn')
      if (!cancelBtn) {
        cancelBtn = document.createElement('button')
        cancelBtn.type = 'button'
        cancelBtn.className = 'btn-secondary cancel-edit-btn'
        cancelBtn.textContent = 'Avbryt'
        cancelBtn.addEventListener('click', () => {
          form.reset()
          delete form.dataset.editId
          submitBtn.textContent = 'Legg til medlem'
          cancelBtn.remove()
        })
        submitBtn.parentNode.appendChild(cancelBtn)
      }
      
      // Scroll to form
      form.scrollIntoView({ behavior: 'smooth' })
      return
    }

    const setPrBtn = e.target.closest('[data-set-pr]')
    if (setPrBtn) {
      const id = setPrBtn.dataset.setPr
      const d = db.get()
      const m = d.members.find(x => x.id === id)
      if (!m) return
      const val = prompt('Skriv inn PR (høyeste grad/farge)', m.pr || '')
      if (val === null) return
      
      try {
        const updatedMember = { ...m, pr: val.trim() }
        await api.put(`/members/${id}`, updatedMember)
        
        // Update global data
        const memberIndex = globalData.members.findIndex(x => x.id === id)
        if (memberIndex !== -1) {
          globalData.members[memberIndex] = updatedMember
        }
        
        renderMembers()
      } catch (error) {
        console.error('Failed to update PR:', error)
        alert('Failed to update PR. Please try again.')
      }
      return
    }
  })

  // Reports
  function refreshReports() {
    const d = db.get()
    $('#statMembers').textContent = d.members.length
    $('#statSessions').textContent = d.sessions.length
    const totalAttendance = Object.values(d.attendance).reduce((sum, att) => sum + Object.values(att).filter(r => r.attended).length, 0)
    $('#statAttendance').textContent = totalAttendance
    const avgOcc = (() => {
      const per = d.sessions.map(s => {
        const att = d.attendance[s.id] || {}
        const reg = Object.values(att).filter(r => r.registered).length
        return s.capacity ? reg / s.capacity : 0
      })
      if (!per.length) return 0
      return Math.round((per.reduce((a,b) => a+b, 0) / per.length) * 100)
    })()
    $('#statOccupancy').textContent = avgOcc + '%'

    // Top attendees
    const attendCounts = new Map()
    d.members.forEach(m => attendCounts.set(m.id, 0))
    Object.values(d.attendance).forEach(att => {
      Object.entries(att).forEach(([mid, rec]) => {
        if (rec.attended) {
          attendCounts.set(mid, (attendCounts.get(mid) || 0) + 1)
        }
      })
    })
    const topAttendees = Array.from(attendCounts.entries())
      .map(([mid, count]) => ({ member: d.members.find(m => m.id === mid), count }))
      .filter(x => x.member)
      .sort((a,b) => b.count - a.count)
      .slice(0, 5)
    
    $('#topAttendees').innerHTML = topAttendees
      .map(x => `<div class="flex justify-between"><span>${x.member.name}</span><span>${x.count} økter</span></div>`)
      .join('')
  }

  // My Attendance functions
  function populateMyAttendanceMemberSelect() {
    // This function is kept for compatibility but now just renders the member list
    renderMyAttendanceMemberList()
  }

  const myAttendanceSearchInput = $('#myAttendanceMemberSearchInput')
  const myAttendanceDropdown = $('#myAttendanceMemberDropdown')
  const myAttendanceMemberList = $('#myAttendanceMemberList')
  const myAttendanceSelectedInfo = $('#myAttendanceSelectedMemberInfo')
  const myAttendanceSelectedName = $('#myAttendanceSelectedMemberName')
  const myAttendanceSelectedDetails = $('#myAttendanceSelectedMemberDetails')

  function renderMyAttendanceMemberList(query = '') {
    const d = db.get()
    const filteredMembers = d.members
      .filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10) // Limit to 10 results
    
    myAttendanceMemberList.innerHTML = filteredMembers
      .map(m => `
        <div class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer myAttendance-member-option" data-member-id="${m.id}">
          <div class="font-medium">${m.name}</div>
          <div class="text-sm text-gray-500">${m.belay ? 'Brattkort' : ''}</div>
        </div>
      `)
      .join('')
  }

  function selectMyAttendanceMember(memberId) {
    const d = db.get()
    const member = d.members.find(m => m.id === memberId)
    
    if (member) {
      state.myAttendanceSelectedMember = member
      const searchInput = $('#myAttendanceMemberSearchInput')
      const selectedInfo = $('#myAttendanceSelectedMemberInfo')
      const selectedName = $('#myAttendanceSelectedMemberName')
      const selectedDetails = $('#myAttendanceSelectedMemberDetails')
      const dropdown = $('#myAttendanceMemberDropdown')
      
      searchInput.value = member.name
      selectedName.textContent = member.name
      selectedDetails.textContent = `${member.pr ? `PR: ${member.pr}` : ''}${member.pr && member.belay ? ' • ' : ''}${member.belay ? 'Brattkort' : ''}`
      selectedInfo.classList.remove('hidden')
      dropdown.classList.add('hidden')
    } else {
      state.myAttendanceSelectedMember = null
      const searchInput = $('#myAttendanceMemberSearchInput')
      const selectedInfo = $('#myAttendanceSelectedMemberInfo')
      searchInput.value = ''
      selectedInfo.classList.add('hidden')
    }
    renderMyAttendance()
  }

  function renderMyAttendance() {
    const member = state.myAttendanceSelectedMember
    if (!member) {
      $('#myAttendanceEmpty').classList.remove('hidden')
      $('#myAttendanceGrid').classList.add('hidden')
      $('#myAttendanceStats').classList.add('hidden')
      return
    }

    $('#myAttendanceEmpty').classList.add('hidden')
    $('#myAttendanceGrid').classList.remove('hidden')
    $('#myAttendanceStats').classList.remove('hidden')

    const d = db.get()
    const q = state.filter.myAttendanceQuery.toLowerCase()
    const filter = state.filter.myAttendanceFilter

    // Get all sessions (past and future) for this member
    const sessions = d.sessions
      .slice()
      .sort((a,b) => b.date.localeCompare(a.date)) // Newest first
      .filter(s => !q || [s.location, s.discipline, s.notes].join(' ').toLowerCase().includes(q))
      .map(s => {
        const att = d.attendance[s.id] || {}
        const memberRec = att[member.id] || {}
        return {
          ...s,
          registered: !!memberRec.registered,
          attended: !!memberRec.attended,
          notes: memberRec.notes || ''
        }
      })

    // Apply filter
    const filteredSessions = sessions.filter(s => {
      if (filter === 'registered') return s.registered
      if (filter === 'attended') return s.attended
      if (filter === 'missed') return s.registered && !s.attended
      return true // 'all'
    })

    // Update stats
    const totalSessions = sessions.length
    const registeredSessions = sessions.filter(s => s.registered).length
    const attendedSessions = sessions.filter(s => s.attended).length
    const attendanceRate = registeredSessions > 0 ? Math.round((attendedSessions / registeredSessions) * 100) : 0

    $('#myTotalSessions').textContent = totalSessions
    $('#myRegisteredSessions').textContent = registeredSessions
    $('#myAttendedSessions').textContent = attendedSessions
    $('#myAttendanceRate').textContent = attendanceRate + '%'

    // Render sessions grid
    const grid = $('#myAttendanceGrid')
    if (!filteredSessions.length) {
      grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">Ingen økter matcher filteret</div>'
      return
    }

    grid.innerHTML = filteredSessions
      .map(s => {
        const isPast = s.date < new Date().toISOString().split('T')[0]
        let statusClass = 'bg-gray-300' // Default: not participated
        let statusText = 'Ikke deltatt'
        
        if (s.attended) {
          statusClass = 'bg-green-500'
          statusText = 'Møtt opp'
        } else if (s.registered) {
          statusClass = 'bg-blue-500'
          statusText = 'Påmeldt, ikke møtt'
        }

        return `<div class="session-card ${isPast ? 'past-session' : 'future-session'}" data-session-id="${s.id}">
          <div class="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            <div class="flex items-center justify-between mb-2">
              <div class="font-semibold">${fmtDate(s.date)}</div>
              <div class="w-3 h-3 rounded-full ${statusClass}" title="${statusText}"></div>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">${s.location}</div>
            <div class="text-sm text-gray-500 mb-2">${disciplineLabel(s.discipline)}</div>
            <div class="text-xs text-gray-500">${fmtTime(s.start)}–${fmtTime(s.end)}</div>
            ${s.notes ? `<div class="text-xs mt-2 italic">${s.notes}</div>` : ''}
            
            ${!isPast ? `
              <div class="flex gap-1 mt-3">
                <button class="btn-xs ${s.registered ? 'btn-secondary' : 'btn-primary'}" 
                        data-action="${s.registered ? 'unregister' : 'register'}">
                  ${s.registered ? 'Meld av' : 'Meld på'}
                </button>
                ${s.registered ? `
                  <button class="btn-xs btn-secondary" 
                          data-action="toggle-attended">
                    ${s.attended ? 'Ikke møtt' : 'Møtt opp'}
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>
        </div>`
      })
      .join('')
  }

  async function updateMyAttendance(sessionId, field, value) {
    const member = state.myAttendanceSelectedMember
    if (!member) return

    try {
      const currentData = globalData.attendance[sessionId]?.[member.id] || {}
      const updatedData = { ...currentData, [field]: value }
      
      await api.put(`/attendance/${sessionId}/${member.id}`, updatedData)
      
      // Update global data
      if (!globalData.attendance[sessionId]) {
        globalData.attendance[sessionId] = {}
      }
      globalData.attendance[sessionId][member.id] = updatedData
      
      renderMyAttendance()
      refreshReports()
    } catch (error) {
      console.error('Failed to update attendance:', error)
      alert('Failed to update attendance. Please try again.')
    }
  }

  // My Attendance event listeners
  myAttendanceSearchInput.addEventListener('input', e => {
    const query = e.target.value.trim()
    if (query.length > 0) {
      renderMyAttendanceMemberList(query)
      myAttendanceDropdown.classList.remove('hidden')
    } else {
      myAttendanceDropdown.classList.add('hidden')
      // If input is cleared, clear selection
      if (state.myAttendanceSelectedMember) {
        state.myAttendanceSelectedMember = null
        myAttendanceSelectedInfo.classList.add('hidden')
        renderMyAttendance()
      }
    }
  })

  myAttendanceSearchInput.addEventListener('focus', e => {
    const query = e.target.value.trim()
    if (query.length > 0) {
      renderMyAttendanceMemberList(query)
      myAttendanceDropdown.classList.remove('hidden')
    }
  })

  myAttendanceMemberList.addEventListener('click', e => {
    const memberOption = e.target.closest('.myAttendance-member-option')
    if (memberOption) {
      const memberId = memberOption.dataset.memberId
      selectMyAttendanceMember(memberId)
    }
  })

  // Hide dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!myAttendanceSearchInput.contains(e.target) && !myAttendanceDropdown.contains(e.target)) {
      myAttendanceDropdown.classList.add('hidden')
    }
  })

  $('#myAttendanceSearch').addEventListener('input', e => {
    state.filter.myAttendanceQuery = e.target.value
    renderMyAttendance()
  })

  $('#myAttendanceFilter').addEventListener('change', e => {
    state.filter.myAttendanceFilter = e.target.value
    renderMyAttendance()
  })

  $('#myAttendanceGrid').addEventListener('click', async e => {
    const card = e.target.closest('.session-card')
    if (!card) return
    
    const sessionId = card.dataset.sessionId
    const action = e.target.closest('[data-action]')?.dataset.action
    
    if (action) {
      e.preventDefault()
      
      if (action === 'register') {
        await updateMyAttendance(sessionId, 'registered', true)
      } else if (action === 'unregister') {
        await updateMyAttendance(sessionId, 'registered', false)
        await updateMyAttendance(sessionId, 'attended', false) // Also unmark attendance
      } else if (action === 'toggle-attended') {
        const member = state.myAttendanceSelectedMember
        const currentData = globalData.attendance[sessionId]?.[member.id] || {}
        await updateMyAttendance(sessionId, 'attended', !currentData.attended)
      }
    }
  })

  // Import / Export
  function exportJson() {
    const d = db.get()
    download('bulldok.json', JSON.stringify(d, null, 2), 'application/json')
  }

  function exportCsv(type) {
    const d = db.get()
    let rows = []
    if (type === 'members') {
      rows = [['id','navn','epost','brattkort','nødtelefon','pr','notater'],
        ...d.members.map(m => [m.id,m.name,m.email,m.belay,m.emergency,m.pr,m.notes])]
    } else if (type === 'sessions') {
      rows = [['id','dato','sted','start','slutt','disiplin','kapasitet','notater'],
        ...d.sessions.map(s => [s.id,s.date,s.location,s.start,s.end,s.discipline,s.capacity,s.notes])]
    } else if (type === 'attendance') {
      rows = [['øktId','medlemId','påmeldt','møtte','notater'],
        ...Object.entries(d.attendance).flatMap(([sid, att]) => Object.entries(att).map(([mid, rec]) => [sid, mid, rec.registered, rec.attended, rec.notes]))]
    }
    const csv = rows.map(row => row.map(cell => `"${(cell||'').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    download(`bulldok-${type}.csv`, csv, 'text/csv')
  }

  function download(filename, content, type) {
    const a = document.createElement('a')
    const blob = new Blob([content], { type })
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importJson(file) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Validate data structure
      if (!data.members || !data.sessions || !data.attendance) {
        throw new Error('Invalid data format')
      }
      
      if (confirm('Dette vil overskrive all eksisterende data. Er du sikker?')) {
        await api.put('/data', data)
        globalData = data
        render()
        alert('Data importert successfully!')
      }
    } catch (error) {
      console.error('Import failed:', error)
      alert('Import failed: ' + error.message)
    }
  }

  // Import/Export event listeners
  $('#exportJsonBtn').addEventListener('click', exportJson)
  $('#exportMembersBtn').addEventListener('click', () => exportCsv('members'))
  $('#exportSessionsBtn').addEventListener('click', () => exportCsv('sessions'))
  $('#exportAttendanceBtn').addEventListener('click', () => exportCsv('attendance'))

  $('#importJsonBtn').addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files[0]
      if (file) importJson(file)
    }
    input.click()
  })

  // Admin login - DOM elements (moved event listeners to setupEventListeners())
  const adminLoginDialog = $('#adminLoginDialog')
  const adminPasswordInput = $('#adminPasswordInput')
  const adminLoginError = $('#adminLoginError')

  // Event listeners moved to setupEventListeners()
  /*
  $('#adminLoginBtn').addEventListener('click', () => {
    if (isAdminLoggedIn) {
      logoutAdmin()
    } else {
      adminLoginDialog.showModal()
      adminPasswordInput.focus()
    }
  })

  $('#adminLoginForm').addEventListener('submit', e => {
    e.preventDefault()
    const password = adminPasswordInput.value
    if (loginAdmin(password)) {
      adminLoginDialog.close()
      adminPasswordInput.value = ''
      adminLoginError.classList.add('hidden')
    } else {
      adminLoginError.classList.remove('hidden')
      adminPasswordInput.select()
    }
  })
  */

  // Close dialogs
  $$('[data-close-dialog]').forEach(btn => {
    btn.addEventListener('click', e => {
      const dialog = btn.closest('dialog')
      if (dialog) {
        dialog.close()
        // Clear form if it's the admin login dialog
        if (dialog.id === 'adminLoginDialog') {
          document.getElementById('adminPasswordInput').value = ''
          document.getElementById('adminLoginError').classList.add('hidden')
        }
      }
    })
  })

  // Initialize application
  async function initializeApp() {
    console.log('Initializing application...')
    try {
      // Load data from server
      console.log('Loading data from server...')
      await db.load()
      console.log('Data loaded successfully')
      
      // Setup event listeners
      console.log('Setting up event listeners...')
      setupEventListeners()
      
      // Initialize theme
      console.log('Initializing theme...')
      initTheme()
      
      // Check admin status
      console.log('Checking admin status...')
      checkAdminStatus()
      
      // Render all components
      console.log('Rendering components...')
      render()
      
      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
      alert('Failed to load application data. Please refresh the page.')
    }
  }

  // Start the application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp)
  } else {
    initializeApp()
  }

  // Expose functions globally for debugging
  window.render = render
  window.db = db
  window.api = api

})()
