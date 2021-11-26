function init() {
  console.log("init");


    var player = new AVPlayer('https://livesim.dashif.org/dash/vod/testpic_2s/multi_subs.mpd');
    document.body.appendChild(player.getMediaElement());

    player.onPlayStateChange = function(state) {
        console.log("onPlayStateChange: " + AVPlayer.getPlayStateStringFromCode(state));
        
        // if error state, then exit
        if (state == AVPlayer.PLAY_STATE_ERROR) {
            console.log(player.error)
        }
    };

    player.load(true);
    window.player = player;
    console.log("player: " , player);
}

document.addEventListener("DOMContentLoaded", init);



