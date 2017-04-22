<html>

<body>
	<img id="background" style="position:fixed; width:100%; height:100%" src="" />
	<div style="position:relative; right:5% width:8em; height:4em">
		<div style="position:absolute; width:100%; height:50%; background-color:#000000"></div>
		<div id="respBar" style="position:absolute; width:"></div>
		<img id="greenFlag" style="width:20%; height:50%" src="" />
		<img id="greyFlag" style="width:20%; height:50%" src="" />
	</div>
	<canvas id="canv"></canvas>
</body>

</html>

<script>

objs = {
	Players
}

function Player() {
	
}


socket.on('player-join', {
	objs.Players.push(new Player());
});

var canv = document.getElementById("canv");

var ctx = canv.getContext("2d");

var greenFlag = new Image();
greenFlag.src = "/";

ctx.drawImage(greenFlag);

</script>