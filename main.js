function init() {
  console.log("init");


  // https://testweb.playready.microsoft.com/Content/Content4X
  var player = new AVPlayer(
    "https://test.playready.microsoft.com/media/dash/APPLEENC_CBCS_BBB_1080p/1080p.mpd"
  );

  console.log("player", player.getMediaElement());
  // player.destroy();
  document.body.appendChild(player.getMediaElement());
  player.getMediaElement().setAttribute("style", "border:1px solid red");
  player.getMediaElement().width = window.innerWidth;
  player.getMediaElement().height = window.innerHeight;

  player.onPlayStateChange = function (state) {
    console.log(
      "onPlayStateChange: " +
        state +
        ", " +
        AVPlayer.getPlayStateStringFromCode(state)
    );

    // if error state, then exit
    if (state == AVPlayer.PLAY_STATE_ERROR) {
      console.log(player.error);
    }
  };

  player.setLaURL(
    "http://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(persist:false,ck:W31bfVt9W31bfVt9W31bfQ==,ckt:aescbc)"
  );
  player.load(true);
  window.player = player;
  // console.log("player: " , player);
}

document.addEventListener("DOMContentLoaded", init);
