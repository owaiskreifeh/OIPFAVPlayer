function init() {
  console.log("init");


    var player = new AVPlayer(
        "https://cdxaws-ak.akamaized.net/out/v1/4ce8220a05434a24a06cec139a4880c1/c96d37fedb44465f8a19c65563004303/2702b4dd304c43e88bcfa4f04f464736/manifest.mpd?aws.manifestfilter=video_height:288-600;audio_language:ar;subtitle_language:none"

);

console.log("player", player.getMediaElement());
    // player.destroy();
    document.body.appendChild(player.getMediaElement());
    player.getMediaElement().setAttribute("style", "border:1px solid red");
    player.getMediaElement().width =window.innerWidth
    player.getMediaElement().height = window.innerHeight

    player.onPlayStateChange = function(state) {
        console.log("onPlayStateChange: " +state+", "+ AVPlayer.getPlayStateStringFromCode(state));
        
        // if error state, then exit
        if (state == AVPlayer.PLAY_STATE_ERROR) {
            console.log(player.error)
        }
    };

    player.setLaURL("https://drm.cloud.insysvt.com/acquire-license/playready?BrandGuid=2be49af0-6fbd-4511-8e11-3d6523185bb4&UserToken=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2MzgwMTM3MzUuNzI0MjI3LCJkcm1Ub2tlbkluZm8iOnsiZXhwIjoiMjAyMS0xMS0yN1QxMTo0ODo1NS43MjQyMjciLCJraWQiOlsiKiJdLCJwIjp7InBlcnMiOmZhbHNlLCJlZCI6IjIwMjEtMTEtMjdUMTE6NDg6NTUuNzI0MjI3IiwiZXhjIjp7IkZhaXJwbGF5TGVhc2VEdXJhdGlvblNlY29uZHMiOjg2MDAwLCJGYWlycGxheVJlbnRhbER1cmF0aW9uU2Vjb25kcyI6ODYwMDB9fX19.j3mCKzmh0yb5SfGzoqOF7Z2sKBygZOeL1_9QiviHBk0")
    player.load(true);
    window.player = player;
    // console.log("player: " , player);
}

// document.addEventListener("DOMContentLoaded", init);



