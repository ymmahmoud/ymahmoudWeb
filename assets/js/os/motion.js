export function play(el, className) {
  el.classList.add(className);
  const running = el.getAnimations().filter(a => a.animationName);
  const finish = () => el.classList.remove(className);
  if (!running.length) {
    finish();
    return Promise.resolve();
  }
  return Promise.allSettled(running.map(a => a.finished)).then(finish);
}

export function setVars(el, vars) {
  Object.entries(vars).forEach(([name, value]) => el.style.setProperty(`--${name}`, value));
}
