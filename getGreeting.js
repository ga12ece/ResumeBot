const random = array => { return array[Math.floor(Math.random() * array.length)] }

const getGreetings = () => {
  const answers = [
    'Hello! Welcome to Resume Bot',
    'Hey, nice to see you. I - Resume Bot will assist you to get your dream jobs',
    'Welcome to Resume Bot',
    'Hey, Finding your dream job with us is easy.'
  ]
  return random(answers)
}

module.exports = getGreetings