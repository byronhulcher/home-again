/* global Graphpaper */
(function () {
  const graphpaper = new Graphpaper()
  const random = Math.random.bind()
  const setInterval = window.setInterval.bind()
  const compassEl = document.querySelector('.compass')
  const starEl = document.querySelector('.star')
  const playerEl = document.querySelector('.player')
  const stepMilliseconds = 666
  const cellSize = 25
  const cameraTrackRange = 7

  let camera = {
    x: 0,
    y: 0
  }
  let player = {}
  let paused = false
  let interval
  let lastSavedState

  function saveToLocalStorage () {
    let saveState = window.btoa(JSON.stringify(player))

    lastSavedState = saveState

    try {
      window.localStorage.setItem('player', saveState)
    } catch (e) {}
  }

  function loadFromLocalStorage () {
    try {
      player = JSON.parse(window.atob(window.localStorage.getItem('player')))
    } catch (e) {}

    if (!player || typeof player.x === 'undefined' || typeof player.y === 'undefined') {
      resetPlayer()
    }

    resetCamera()
  }

  function hasSaveDataBeenModified () {
    let saveState

    try {
      saveState = window.localStorage.getItem('player')
    } catch (e) {}

    if (typeof lastSavedState !== 'undefined' && typeof saveState !== 'undefined') {
      return lastSavedState !== saveState
    }

    return false
  }

  function resetCamera () {
    camera.x = player.x
    camera.y = player.y
  }

  function resetPlayer () {
    player = {
      steps: 0,
      x: 0,
      y: 0,
      won: false,
      submitted: false
    }

    saveToLocalStorage()
  }

  function edgeOfView (rect, theta) {
    const twoPI = Math.PI * 2

    while (theta < -Math.PI) {
      theta += twoPI
    }

    while (theta > Math.PI) {
      theta -= twoPI
    }

    const rectAtan = Math.atan2(rect.height, rect.width)
    const tanTheta = Math.tan(theta)
    let region

    if ((theta > -rectAtan) && (theta <= rectAtan)) {
      region = 1
    } else if ((theta > rectAtan) && (theta <= (Math.PI - rectAtan))) {
      region = 2
    } else if ((theta > (Math.PI - rectAtan)) || (theta <= -(Math.PI - rectAtan))) {
      region = 3
    } else {
      region = 4
    }

    let edgePoint = { x: rect.width / 2, y: rect.height / 2 }
    let xFactor = 1
    let yFactor = 1

    switch (region) {
      case 1: yFactor = -1; break
      case 2: yFactor = -1; break
      case 3: xFactor = -1; break
      case 4: xFactor = -1; break
    }

    if ((region === 1) || (region === 3)) {
      edgePoint.x += xFactor * (rect.width / 2.0) // "Z0"
      edgePoint.y += yFactor * (rect.width / 2.0) * tanTheta
    } else {
      edgePoint.x += xFactor * (rect.height / (2.0 * tanTheta)) // "Z1"
      edgePoint.y += yFactor * (rect.height / 2.0)
    }

    return edgePoint
  };

  function updateCompass () {
    const angleRadians = Math.atan2(player.y, -1 * player.x)

    compassEl.setAttribute('style', `transform: rotate(${angleRadians}rad); left: ${501.0 / 2.0 - (cellSize * (camera.x - player.x))}px; bottom: ${501.0 / 2.0 - (cellSize * (camera.y - player.y))}px;`)
    compassEl.classList.toggle('hidden', (player.won || (player.x === 0 && player.y === 0)))
  }

  function updateOrigin () {
    if (Math.abs(camera.x) > 10 || Math.abs(camera.y) > 10) {
      const angleRadians = Math.atan2((camera.y), -1 * (camera.x))
      const locationOnSquare = edgeOfView({ height: 521.0, width: 521.0 }, angleRadians)

      starEl.setAttribute('style', `left: ${locationOnSquare.x - 10}px; bottom: ${locationOnSquare.y - 16}px;`)
      starEl.classList.add('offscreen')
    } else {
      starEl.setAttribute('style', `bottom: ${501.0 / 2.0 - (cellSize * (camera.y))}px; left: ${501.0 / 2.0 - (cellSize * (camera.x))}px`)
      starEl.classList.remove('offscreen')
    }

    starEl.classList.toggle('pulsing', (player.won))
    starEl.classList.toggle('hidden', (player.x === 0 && player.y === 0 && !player.won))
  }

  function updateUX () {
    graphpaper.setProps({ offsetX: camera.x * cellSize * -1, offsetY: camera.y * cellSize })
    playerEl.setAttribute('style', `left: ${501.0 / 2.0 - (cellSize * (camera.x - player.x))}px; bottom: ${501.0 / 2.0 - (cellSize * (camera.y - player.y)) + 4}px;`)

    document.querySelector('header .location').innerHTML = `( ${player.x}, ${player.y} )`
    document.querySelector('header .steps').innerHTML = `${player.steps} Steps`

    document.querySelector('.graph-container .ux').classList.toggle('hidden', !player.won)

    if (player.won || player.gameover) {
      document.querySelector('.graph-container .score').innerHTML = `After ${player.steps} steps`
    }

    document.querySelector('.ux .you-win').classList.toggle('hidden', !player.won || !!player.gameover)
    document.querySelector('.ux .game-over').classList.toggle('hidden', !player.won || !player.gameover)

    document.querySelector('.ux .submit').classList.toggle('hidden', !!(player.submitted || player.gameover))
    document.querySelector('.ux .reset').classList.toggle('hidden', !player.submitted && !player.gameover)

    updateCompass()
    updateOrigin()
  }

  function createGraph () {
    graphpaper.setProps({
      'width': (cellSize * 20) + 1,
      'height': (cellSize * 20) + 1,
      'cellWidth': cellSize,
      'cellHeight': cellSize,
      'minorColor': [
        0.63671875,
        0.765625,
        0.95703125,
        1
      ],
      'majorColor': [
        0.84765625,
        0.1953125,
        0.1953125,
        1
      ],
      'majorRows': 10,
      'majorCols': 10,
      'alpha': 1,
      'offsetX': player.x * cellSize,
      'offsetY': player.y * cellSize,
      'canvasElement': null
    })

    document.querySelector('.graph-container').appendChild(graphpaper.element)
  }

  function resetGame () {
    if (!player.won && !window.confirm('Are you sure?')) {
      return
    }

    clearTicks()
    resetPlayer()
    resetCamera()
    updateUX()
    startTicks()
  }

  function setupButtons () {
    document.addEventListener('click', function (event) {
      if (event.target.classList.contains('reset')) {
        resetGame()
      }

      if (event.target.classList.contains('submit')) {
        submitHighScore()
      }
    })
  }

  function updateCamera () {
    if (player.x >= camera.x + cameraTrackRange) {
      camera.x = camera.x + 1
    } else if (player.x <= camera.x - cameraTrackRange) {
      camera.x = camera.x - 1
    }

    if (player.y >= camera.y + cameraTrackRange) {
      camera.y = camera.y + 1
    } else if (player.y <= camera.y - cameraTrackRange) {
      camera.y = camera.y - 1
    }
  }

  function updatePlayer () {
    const move = Math.floor(random() * Math.floor(4)) // random int

    switch (move) {
      case 0:
        player.x = player.x + 1
        break
      case 1:
        player.x = player.x - 1
        break
      case 2:
        player.y = player.y + 1
        break
      case 3:
        player.y = player.y - 1
        break
      default:
        console.log('how did you get here?')
    }

    player.steps += 1

    if (player.x === 0 && player.y === 0) {
      player.won = true
    }
  };

  function gameOver () {
    player.won = true
    player.gameover = true
  }

  function onTick () {
    if (hasSaveDataBeenModified()) {
      gameOver()
    } else {
      updatePlayer()
      saveToLocalStorage()
    }

    if (player.won) {
      resetCamera()
      clearTicks()
    }

    updateCamera()
    updateUX()
  }

  function clearTicks () {
    clearInterval(interval)
  }

  function htmlEncode (s) {
    return s.replace(/&(?!\w+([;\s]|$))/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function updateHighScoreTable (scores) {
    document.body.querySelector('.high-score-container tbody').innerHTML = `
      ${scores.map((item, i) => `
        <tr><td>${htmlEncode(item.name)}</td><td>${item.score.toLocaleString()}</td></tr>
      `).join('')}
    `
    return scores
  }

  function getHighScores () {
    return window.fetch('/scores/', {
      method: 'GET',
      credentials: 'same-origin'
    })
      .then(response => response.json())
      .catch(() => [])
      .then(scores => updateHighScoreTable(scores))
  }

  function submitHighScore () {
    const maxNameLength = 20
    let name = ''
    let highScores = []

    while (name.length <= 0) {
      name = window.prompt(`What's your name? [Max length: ${maxNameLength}]`)
    }

    name = name.slice(0, maxNameLength)

    getHighScores()
      .then(scores => {
        highScores = scores
        return window.fetch('/scores/', {
          body: JSON.stringify({ steps: player.steps, name: name }),
          credentials: 'same-origin',
          headers: {
            'content-type': 'application/json'
          },
          method: 'POST'
        })
      })
      .then(response => response.json())
      .catch(() => highScores)
      .then(scores => {
        player.submitted = true
        updateHighScoreTable(scores)
        updateUX()
        saveToLocalStorage()
      })
  }

  function startTicks () {
    if (!paused) {
      interval = setInterval(onTick, stepMilliseconds)
    }
  }

  function main () {
    loadFromLocalStorage()

    if (!(player && player.steps)) {
      resetPlayer()
    }

    createGraph()

    setupButtons()

    updateUX()

    getHighScores()

    if (!player.won) {
      startTicks()
    }
  }

  main()
}())
