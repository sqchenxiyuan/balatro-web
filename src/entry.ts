const isGame=()=>!location.hash||location.hash==='#play';
const game=isGame();
if(game)void import('./game-main');else void import('./main');
addEventListener('hashchange',()=>{if(isGame()!==game)location.reload();});
