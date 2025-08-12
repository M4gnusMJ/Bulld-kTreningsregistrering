/*
  Climb Club - Local-first web app
  Data model stored in localStorage.
*/

;(function () {
  // Admin authentication
  const adminPassword = 'bulldok2025' // Change this to a secure password
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
      adminBtn.classList.add('border-gray-200', 'dark:border-gray-800', 'hover:bg-gray-100', 'dark:hover:bg-gray-900')
      adminBtn.classList.remove('bg-green-100', 'dark:bg-green-900', 'border-green-300', 'dark:border-green-700', 'text-green-700', 'dark:text-green-300')
      adminStatus.textContent = 'Admin Login'
      adminBtn.title = 'Logg inn som admin'
      
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
    
    // Refresh sessions list to update admin controls
    if (typeof renderSessions === 'function') {
      renderSessions()
    }
  }
  
  function requireAdmin(action) {
    if (!isAdminLoggedIn) {
      alert('Admin-tilgang er påkrevd for denne handlingen.')
      return false
    }
    return true
  }

  const db = {
    get() {
      try {
        return JSON.parse(localStorage.getItem('climbclub') || '{}')
      } catch (e) {
        return {}
      }
    },
    set(data) {
      localStorage.setItem('climbclub', JSON.stringify(data))
    },
    ensure() {
      const d = this.get()
      if (!d.members) d.members = []
      if (!d.sessions) d.sessions = []
      if (!d.attendance) d.attendance = {} // sessionId -> { memberId -> { registered, attended, notes } }
      if (!d._seq) d._seq = 1
      this.set(d)
      return d
    },
    id() {
      const d = this.get()
      const id = d._seq
      d._seq += 1
      this.set(d)
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
      myAttendanceFilter: 'all'
    }
  }

  // Utilities
  const $ = (sel, el=document) => el.querySelector(sel)
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel))
  const fmtDate = iso => new Date(iso).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
  const fmtTime = t => {
    if (!t) return '—'
    // Ensure 24-hour format display
    if (t.match(/^\d{1,2}:\d{2}$/)) {
      // Already in HH:MM format, ensure leading zero for hours if needed
      const parts = t.split(':')
      const hours = parts[0].padStart(2, '0')
      const minutes = parts[1]
      return `${hours}:${minutes}`
    }
    // If it's some other format, try to parse and convert to 24-hour
    try {
      const date = new Date(`1970-01-01 ${t}`)
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('nb-NO', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      }
    } catch (e) {
      // If parsing fails, return as-is
    }
    return t || '—'
  }
  const disciplineLabel = (d) => ({
    'Bouldering': 'Buldre',
    'Top-rope': 'Topptau',
    'Lead': 'Led',
    'Strength/Conditioning': 'Styrke/kondisjon'
  }[d] || d)

  function saveAndRender() {
    render()
  }

  // Theme toggle
  $('#themeToggle').addEventListener('click', () => {
    const root = document.documentElement
    const dark = root.classList.toggle('dark')
    localStorage.theme = dark ? 'dark' : 'light'
  })

  // Tabs
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
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
  $('[data-tab="register"]').dataset.active = 'true'

  // Forms
  $('#sessionForm').addEventListener('submit', e => {
    e.preventDefault()
    if (!requireAdmin('create session')) return
    
    const fd = new FormData(e.currentTarget)
    const session = {
      id: db.id(),
      date: fd.get('date'),
      location: fd.get('location').trim(),
      start: fd.get('start'),
      end: fd.get('end'),
      discipline: fd.get('discipline'),
      capacity: Number(fd.get('capacity') || 0),
      notes: fd.get('notes').trim()
    }
    const d = db.ensure()
    d.sessions.push(session)
    db.set(d)
    e.currentTarget.reset()
    renderSessions()
    refreshAttendanceSessions()
    refreshReports()
  })

  $('#memberForm').addEventListener('submit', e => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const member = {
      id: db.id(),
      name: fd.get('name').trim(),
      email: fd.get('email').trim(),
      belay: !!fd.get('belay'),
      emergency: fd.get('emergency').trim(),
      notes: fd.get('notes').trim(),
      pr: (fd.get('pr') || '').trim()
    }
    const d = db.ensure()
    d.members.push(member)
    db.set(d)
    e.currentTarget.reset()
    populateMemberSelect()
    renderMembers()
    refreshReports()
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

  // Member Registration
  const memberSearchInput = $('#memberSearchInput')
  const memberDropdown = $('#memberDropdown')
  const memberList = $('#memberList')
  const selectedMemberInfo = $('#selectedMemberInfo')
  const selectedMemberName = $('#selectedMemberName')
  const selectedMemberDetails = $('#selectedMemberDetails')

  function populateMemberSelect() {
    // This function is kept for compatibility but now just renders the member list
    renderMemberList()
  }

  function renderMemberList(query = '') {
    const d = db.ensure()
    const filteredMembers = d.members
      .slice()
      .sort((a,b) => a.name.localeCompare(b.name))
      .filter(m => !query || m.name.toLowerCase().includes(query.toLowerCase()))
    
    if (filteredMembers.length === 0) {
      memberList.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500">Ingen medlemmer funnet</div>'
    } else {
      memberList.innerHTML = filteredMembers
        .map(m => `<div class="member-option px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-sm" data-member-id="${m.id}">
          <div class="font-medium">${m.name}</div>
          <div class="text-xs text-gray-500">${m.pr ? `PR: ${m.pr}` : ''}${m.pr && m.belay ? ' • ' : ''}${m.belay ? 'Brattkort' : ''}</div>
        </div>`)
        .join('')
    }
  }

  function selectMember(memberId) {
    const d = db.ensure()
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

  memberSearchInput.addEventListener('blur', e => {
    // Delay hiding dropdown to allow click on member option
    setTimeout(() => {
      memberDropdown.classList.add('hidden')
    }, 150)
  })

  // Handle member selection from dropdown
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

  function renderRegisterSessions() {
    const d = db.ensure()
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      Påmeldt
                    </div>`
                  : `<div class="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      Ikke påmeldt
                    </div>`
                ) : ''}
              </div>
              <div class="text-sm text-gray-500">${disciplineLabel(s.discipline)} • ${fmtTime(s.start)}–${fmtTime(s.end)}</div>
              ${s.notes ? `<div class="text-sm mt-1">${s.notes}</div>` : ''}
              <div class="text-xs text-gray-500 mt-1">
                Påmeldte: ${regCount}${cap ? `/${cap}` : ''}
                ${isFull && !isRegistered ? ' • Fullt!' : ''}
              </div>
            </div>
            <div class="flex gap-2">
              ${!state.selectedMember 
                ? `<span class="text-xs text-gray-500 px-3 py-2">Velg navn for å melde deg på</span>`
                : isRegistered 
                  ? `<button class="btn-danger" data-unregister-session="${s.id}">Meld av</button>`
                  : canRegister 
                    ? `<button class="btn-primary" data-register-session="${s.id}">Meld på</button>`
                    : `<button class="btn-secondary" disabled>Fullt</button>`
              }
            </div>
          </div>
        </div>`
      })
      .join('')
    
    list.innerHTML = items || '<div class="p-6 text-center text-gray-500">Ingen kommende økter.</div>'
  }

  // Registration handlers
  $('#registerSessionsList').addEventListener('click', e => {
    if (!state.selectedMember) {
      alert('Du må velge ditt navn først før du kan melde deg på en økt.')
      return
    }

    const registerBtn = e.target.closest('[data-register-session]')
    if (registerBtn) {
      const sessionId = registerBtn.dataset.registerSession
      const d = db.ensure()
      
      if (!d.attendance[sessionId]) d.attendance[sessionId] = {}
      d.attendance[sessionId][state.selectedMember.id] = { 
        registered: true, 
        attended: false, 
        notes: '' 
      }
      
      db.set(d)
      renderRegisterSessions()
      return
    }

    const unregisterBtn = e.target.closest('[data-unregister-session]')
    if (unregisterBtn) {
      const sessionId = unregisterBtn.dataset.unregisterSession
      const d = db.ensure()
      
      if (d.attendance[sessionId] && d.attendance[sessionId][state.selectedMember.id]) {
        delete d.attendance[sessionId][state.selectedMember.id]
        db.set(d)
      }
      
      renderRegisterSessions()
      return
    }
  })

  // Attendance
  const attendanceSessionSelect = $('#attendanceSessionSelect')
  const attendanceEmpty = $('#attendanceEmpty')
  const attendanceTableWrap = $('#attendanceTableWrap')
  const attendanceTable = $('#attendanceTable')

  function refreshAttendanceSessions() {
    const d = db.ensure()
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
    const d = db.ensure()
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
          <td class="py-2 pr-4"><input type="text" data-field="notes" value="${rec.notes || ''}" class="input"></td>
          <td class="py-2"><button class="btn-secondary" data-remove>Fjern</button></td>
        </tr>`
      })
      .join('')
    attendanceTable.innerHTML = rows || '<tr><td colspan="5" class="py-6 text-center text-gray-500">Ingen medlemmer er lagt til ennå.</td></tr>'
  }

  $('#attendanceAddMemberBtn').addEventListener('click', () => openAddMemberDialog())
  $('#attendanceSaveBtn').addEventListener('click', () => saveAttendance())

  function saveAttendance() {
    const d = db.ensure()
    const sid = attendanceSessionSelect.value
    const att = d.attendance[sid] || {}
    $$('#attendanceTable tr').forEach(tr => {
      const mid = tr.dataset.mid
      att[mid] = {
        registered: $('input[data-field="registered"]', tr).checked,
        attended: $('input[data-field="attended"]', tr).checked,
        notes: $('input[data-field="notes"]', tr).value.trim()
      }
    })
    d.attendance[sid] = att
    db.set(d)
    refreshReports()
  }

  attendanceTable.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]')
    if (!btn) return
    const tr = btn.closest('tr')
    const mid = tr.dataset.mid
    const d = db.ensure()
    const sid = attendanceSessionSelect.value
    const att = d.attendance[sid] || {}
    delete att[mid]
    d.attendance[sid] = att
    db.set(d)
    renderAttendance()
    refreshReports()
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

  addMemberList.addEventListener('click', e => {
    const btn = e.target.closest('[data-add]')
    if (!btn) return
    const mid = btn.dataset.mid
    const d = db.ensure()
    const sid = attendanceSessionSelect.value
    const att = d.attendance[sid] || {}
    if (!att[mid]) att[mid] = { registered: true, attended: false, notes: '' }
    d.attendance[sid] = att
    db.set(d)
    renderAttendance()
    addMemberDialog.close()
    refreshReports()
  })

  function renderAddMemberList() {
    const q = addMemberSearch.value.toLowerCase()
    const d = db.ensure()
    const sid = attendanceSessionSelect.value
    const att = d.attendance[sid] || {}
    const items = d.members
      .filter(m => m.name.toLowerCase().includes(q))
      .map(m => {
        const added = !!att[m.id]
        return `<li class="flex items-center justify-between p-2">
          <div>
            <div class="font-medium">${m.name}</div>
            <div class="text-xs text-gray-500">${m.email || ''}</div>
          </div>
          <button class="btn-${added ? 'secondary' : 'primary'}" data-add data-mid="${m.id}" ${added ? 'disabled' : ''}>${added ? 'Lagt til' : 'Legg til'}</button>
        </li>`
      }).join('')
    addMemberList.innerHTML = items || '<li class="p-3 text-sm text-gray-500">Ingen medlemmer funnet.</li>'
  }

  // Lists
  function renderSessions() {
    const d = db.ensure()
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
              <div class="text-xs text-gray-500 mt-2 text-right">
                Admin-tilgang påkrevd for redigering
              </div>
            `}
          </div>
        </div>`
      })
      .join('')
    list.innerHTML = items || '<div class="p-6 text-center text-gray-500">Ingen økter ennå.</div>'
  }

  function renderMembers() {
    const d = db.ensure()
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
            <div class="text-sm">PR: <strong>${m.pr || '—'}</strong></div>
          </div>
          <div class="sm:text-right">
            <div class="text-sm">Økter: <strong>${sessionsCount}</strong> · Møtt: <strong>${attendedCount}</strong></div>
            <div class="flex gap-2 mt-2 justify-end">
              <button class="btn-secondary" data-set-pr="${m.id}">Sett PR</button>
              <button class="btn-secondary" data-edit-member="${m.id}">Rediger</button>
              <button class="btn-danger" data-delete-member="${m.id}">Slett</button>
            </div>
          </div>
        </div>`
      })
      .join('')
    list.innerHTML = items || '<div class="p-6 text-center text-gray-500">Ingen medlemmer ennå.</div>'
  }

  // Delete handlers
  $('#sessionsList').addEventListener('click', e => {
    const del = e.target.closest('[data-delete-session]')
    if (del) {
      if (!requireAdmin('delete session')) return
      
      const id = del.dataset.deleteSession
      const d = db.ensure()
      const session = d.sessions.find(s => s.id === id)
      if (session && confirm(`Er du sikker på at du vil slette økten "${fmtDate(session.date)} · ${session.location}"? Dette kan ikke angres.`)) {
        d.sessions = d.sessions.filter(s => s.id !== id)
        delete d.attendance[id]
        db.set(d)
        renderSessions()
        refreshAttendanceSessions()
        refreshReports()
      }
      return
    }

    const edit = e.target.closest('[data-edit-session]')
    if (edit) {
      if (!requireAdmin('edit session')) return
      
      // For now, just show an alert - edit functionality can be implemented later
      alert('Redigeringsfunksjonalitet kommer snart!')
      return
    }
  })

  $('#membersList').addEventListener('click', e => {
    const del = e.target.closest('[data-delete-member]')
    if (del) {
      if (!requireAdmin('delete member')) return
      
      const id = del.dataset.deleteMember
      const d = db.ensure()
      const member = d.members.find(m => m.id === id)
      if (member && confirm(`Er du sikker på at du vil slette medlemmet "${member.name}"? Dette kan ikke angres.`)) {
        d.members = d.members.filter(m => m.id !== id)
        for (const sid of Object.keys(d.attendance)) delete d.attendance[sid][id]
        db.set(d)
        renderMembers()
        renderAttendance()
        refreshReports()
      }
      return
    }

    const setPrBtn = e.target.closest('[data-set-pr]')
    if (setPrBtn) {
      const id = setPrBtn.dataset.setPr
      const d = db.ensure()
      const m = d.members.find(x => x.id === id)
      if (!m) return
      const val = prompt('Skriv inn PR (høyeste grad/farge)', m.pr || '')
      if (val === null) return
      m.pr = val.trim()
      db.set(d)
      renderMembers()
      return
    }
  })

  // Reports
  function refreshReports() {
    const d = db.ensure()
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
        if (rec.attended) attendCounts.set(mid, (attendCounts.get(mid)||0) + 1)
      })
    })
    const top = d.members
      .map(m => ({ m, c: attendCounts.get(m.id)||0 }))
      .sort((a,b) => b.c - a.c)
      .slice(0, 9)
      .map(({m, c}) => `<div class="p-4 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
        <div class="font-medium">${m.name}</div>
        <div class="text-sm text-gray-500">Møtt: ${c}</div>
      </div>`)
      .join('')
    $('#topAttendees').innerHTML = top || '<div class="p-4 text-sm text-gray-500">Ingen data ennå.</div>'
  }

  // My Attendance functions
  function populateMyAttendanceMemberSelect() {
    // This function is kept for compatibility but now just renders the member list
    renderMyAttendanceMemberList()
  }

  function renderMyAttendanceMemberList(query = '') {
    const d = db.ensure()
    const memberList = $('#myAttendanceMemberList')
    const filteredMembers = d.members
      .slice()
      .sort((a,b) => a.name.localeCompare(b.name))
      .filter(m => !query || m.name.toLowerCase().includes(query.toLowerCase()))
    
    if (filteredMembers.length === 0) {
      memberList.innerHTML = '<div class="px-3 py-2 text-sm text-gray-500">Ingen medlemmer funnet</div>'
    } else {
      memberList.innerHTML = filteredMembers
        .map(m => `<div class="myAttendance-member-option px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-sm" data-member-id="${m.id}">
          <div class="font-medium">${m.name}</div>
          <div class="text-xs text-gray-500">${m.pr ? `PR: ${m.pr}` : ''}${m.pr && m.belay ? ' • ' : ''}${m.belay ? 'Brattkort' : ''}</div>
        </div>`)
        .join('')
    }
  }

  function selectMyAttendanceMember(memberId) {
    const d = db.ensure()
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

    const d = db.ensure()
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
          <div class="relative p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer transition-colors">
            <div class="absolute top-2 right-2">
              <div class="w-3 h-3 rounded-full ${statusClass}" title="${statusText}"></div>
            </div>
            <div class="pr-6">
              <div class="font-semibold text-sm">${fmtDate(s.date)}</div>
              <div class="text-xs text-gray-500 mb-2">${s.location}</div>
              <div class="text-xs text-gray-600 dark:text-gray-400">${disciplineLabel(s.discipline)}</div>
              <div class="text-xs text-gray-500">${fmtTime(s.start)}–${fmtTime(s.end)}</div>
              ${s.notes ? `<div class="text-xs mt-2 text-gray-600 dark:text-gray-400">${s.notes}</div>` : ''}
            </div>
            ${isPast ? `
              <div class="mt-3 flex gap-1">
                <button class="toggle-registered ${s.registered ? 'active' : ''}" data-action="registered" title="Påmeldt">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </button>
                <button class="toggle-attended ${s.attended ? 'active' : ''}" data-action="attended" title="Møtt opp">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                  </svg>
                </button>
              </div>
            ` : ''}
          </div>
        </div>`
      })
      .join('')
  }

  function updateMyAttendance(sessionId, field, value) {
    const d = db.ensure()
    const member = state.myAttendanceSelectedMember
    if (!member) return

    if (!d.attendance[sessionId]) d.attendance[sessionId] = {}
    if (!d.attendance[sessionId][member.id]) d.attendance[sessionId][member.id] = {}
    
    d.attendance[sessionId][member.id][field] = value
    db.set(d)
    renderMyAttendance()
    refreshReports()
  }

  // Import / Export
  function exportJson() {
    const d = db.ensure()
    download('bulldok.json', JSON.stringify(d, null, 2), 'application/json')
  }
  function exportCsv(type) {
    const d = db.ensure()
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
    const csv = rows.map(r => r.map(x => csvCell(x)).join(',')).join('\n')
    download(`bulldok-${type}.csv`, csv, 'text/csv')
  }
  function csvCell(v) {
    const s = (v ?? '').toString().replaceAll('"', '""')
    return `"${s}"`
  }
  function download(filename, content, type) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type }))
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  $('#exportAllBtn').addEventListener('click', () => {
    if (!requireAdmin('export data')) return
    exportJson()
  })
  $('#exportJsonBtn')?.addEventListener('click', () => {
    if (!requireAdmin('export data')) return
    exportJson()
  })
  $('#exportMembersCsvBtn')?.addEventListener('click', () => {
    if (!requireAdmin('export data')) return
    exportCsv('members')
  })
  $('#exportSessionsCsvBtn')?.addEventListener('click', () => {
    if (!requireAdmin('export data')) return
    exportCsv('sessions')
  })
  $('#exportAttendanceCsvBtn')?.addEventListener('click', () => {
    if (!requireAdmin('export data')) return
    exportCsv('attendance')
  })

  $('#importJsonBtn')?.addEventListener('click', async () => {
    if (!requireAdmin('import data')) return
    
    const inp = $('#importJsonInput')
    if (!inp.files?.length) return alert('Velg en JSON-fil først.')
    
    if (!confirm('ADVARSEL: Dette vil erstatte alle nåværende data. Er du sikker på at du vil fortsette?')) return
    
    const text = await inp.files[0].text()
    try {
      const d = JSON.parse(text)
      if (!d || typeof d !== 'object') throw new Error('Ugyldig fil')
      db.set({ members: d.members||[], sessions: d.sessions||[], attendance: d.attendance||{}, _seq: d._seq||1 })
      render()
      alert('Data importert.')
    } catch (e) {
      alert('Kunne ikke importere: ' + e.message)
    }
  })

  // My Attendance event listeners
  const myAttendanceSearchInput = $('#myAttendanceMemberSearchInput')
  const myAttendanceDropdown = $('#myAttendanceMemberDropdown')
  const myAttendanceMemberList = $('#myAttendanceMemberList')

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
        $('#myAttendanceSelectedMemberInfo').classList.add('hidden')
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

  myAttendanceSearchInput.addEventListener('blur', e => {
    // Delay hiding dropdown to allow click on member option
    setTimeout(() => {
      myAttendanceDropdown.classList.add('hidden')
    }, 150)
  })

  // Handle member selection from dropdown
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

  $('#myAttendanceGrid').addEventListener('click', e => {
    const card = e.target.closest('.session-card')
    if (!card) return
    
    const sessionId = card.dataset.sessionId
    const action = e.target.closest('[data-action]')?.dataset.action
    
    if (action) {
      e.preventDefault()
      const currentValue = e.target.closest('button').classList.contains('active')
      updateMyAttendance(sessionId, action, !currentValue)
    }
  })

  // Render all
  function render() {
    populateMemberSelect()
    populateMyAttendanceMemberSelect()
    renderRegisterSessions()
    renderSessions()
    renderMembers()
    refreshAttendanceSessions()
    refreshReports()
  }

  // Admin login event handlers
  $('#adminLoginBtn').addEventListener('click', () => {
    if (isAdminLoggedIn) {
      if (confirm('Er du sikker på at du vil logge ut som admin?')) {
        logoutAdmin()
      }
    } else {
      document.getElementById('adminLoginDialog').showModal()
    }
  })

  $('#adminLoginForm').addEventListener('submit', e => {
    e.preventDefault()
    const password = document.getElementById('adminPasswordInput').value
    const errorDiv = document.getElementById('adminLoginError')
    
    if (loginAdmin(password)) {
      document.getElementById('adminLoginDialog').close()
      document.getElementById('adminPasswordInput').value = ''
      errorDiv.classList.add('hidden')
    } else {
      errorDiv.classList.remove('hidden')
    }
  })

  // Close dialog handlers
  document.querySelectorAll('[data-close-dialog]').forEach(btn => {
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

  // init - database initialization happens immediately
  db.ensure()
  checkAdminStatus() // Check admin status on page load
  
  // Generate sample sessions for September if no sessions exist
  const d = db.get()
  if (!d.sessions || d.sessions.length === 0) {
    const sampleSessions = []
    
    // August 2025 - Past sessions for testing attendance
    const augustSessions = [
      { date: '2025-08-01', day: 'Friday', discipline: 'Bouldering' },
      { date: '2025-08-06', day: 'Tuesday', discipline: 'Top-rope' },
      { date: '2025-08-08', day: 'Thursday', discipline: 'Lead' },
      { date: '2025-08-13', day: 'Tuesday', discipline: 'Bouldering' }
    ]

    augustSessions.forEach(session => {
      sampleSessions.push({
        id: db.id(),
        date: session.date,
        location: 'Grip Sluppen',
        start: '19:00',
        end: '23:00',
        discipline: session.discipline,
        capacity: 12,
        notes: session.discipline === 'Lead'
          ? 'Ledklatring - brattkort påkrevd!'
          : session.discipline === 'Top-rope'
          ? 'Topptau for alle nivåer. Nybegynnere velkomne!'
          : 'Buldring for alle nivåer. Sosialt og gøy!'
      })
    })
    
    // September 2025 - Tuesdays and Thursdays
    const septemberSessions = [
      // Week 1
      { date: '2025-09-02', day: 'Tuesday', discipline: 'Bouldering' },
      { date: '2025-09-04', day: 'Thursday', discipline: 'Top-rope' },
      // Week 2
      { date: '2025-09-09', day: 'Tuesday', discipline: 'Lead' },
      { date: '2025-09-11', day: 'Thursday', discipline: 'Bouldering' },
      // Week 3
      { date: '2025-09-16', day: 'Tuesday', discipline: 'Strength/Conditioning' },
      { date: '2025-09-18', day: 'Thursday', discipline: 'Top-rope' },
      // Week 4
      { date: '2025-09-23', day: 'Tuesday', discipline: 'Bouldering' },
      { date: '2025-09-25', day: 'Thursday', discipline: 'Lead' },
      // Week 5
      { date: '2025-09-30', day: 'Tuesday', discipline: 'Bouldering' }
    ]
    
    septemberSessions.forEach(session => {
      sampleSessions.push({
        id: db.id(),
        date: session.date,
        location: 'Grip Sluppen',
        start: '19:00',
        end: '23:00',
        discipline: session.discipline,
        capacity: session.discipline === 'Strength/Conditioning' ? 8 : 12,
        notes: session.discipline === 'Strength/Conditioning' 
          ? 'Styrketrening og kondisjon. Ta med treningsklær.'
          : session.discipline === 'Lead'
          ? 'Ledklatring - brattkort påkrevd!'
          : session.discipline === 'Top-rope'
          ? 'Topptau for alle nivåer. Nybegynnere velkomne!'
          : 'Buldring for alle nivåer. Sosialt og gøy!'
      })
    })
    
    const dbData = db.ensure()
    dbData.sessions = sampleSessions
    db.set(dbData)
  }
  
  // Add some sample members if none exist
  const dbData = db.ensure()
  if (!dbData.members || dbData.members.length === 0) {
    const sampleMembers = [
      {
        id: db.id(),
        name: 'Magnus Moldekleiv',
        email: 'magnus@example.com',
        belay: true,
        emergency: '12345678',
        pr: 'V6 / Orange',
        notes: 'Instruktør'
      },
      {
        id: db.id(),
        name: 'Anna Hansen',
        email: 'anna@example.com',
        belay: true,
        emergency: '87654321',
        pr: 'V4 / Grønn',
        notes: ''
      },
      {
        id: db.id(),
        name: 'Erik Normann',
        email: 'erik@example.com',
        belay: false,
        emergency: '11223344',
        pr: 'V2 / Gul',
        notes: 'Nybegynner'
      }
    ]
    
    dbData.members = sampleMembers
    db.set(dbData)
  }

  // DOM rendering happens after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp)
  } else {
    // DOM is already ready
    initializeApp()
  }
  
  function initializeApp() {
    // Generate sample data if needed
    generateSampleData()
    
    // Ensure all render functions are called
    render()
    
    // Multiple aggressive attempts for Firefox/Edge compatibility
    setTimeout(() => {
      render()
    }, 50)
    
    setTimeout(() => {
      render()
    }, 200)
    
    setTimeout(() => {
      render()
    }, 500)
    
    setTimeout(() => {
      render()
    }, 1000)
    
    // Final fallback to ensure sessions are shown
    setTimeout(() => {
      const list = $('#registerSessionsList')
      if (list && (!list.innerHTML || list.innerHTML.trim() === '' || list.innerHTML.includes('Laster økter...'))) {
        renderRegisterSessions()
      }
    }, 1500)
  }

  // Multiple initialization attempts for cross-browser compatibility
  setTimeout(initializeApp, 100)
  setTimeout(initializeApp, 300)
  setTimeout(initializeApp, 800)

  // Expose functions globally for debugging and fallback initialization
  window.renderRegisterSessions = renderRegisterSessions;
  window.render = render;
})()
