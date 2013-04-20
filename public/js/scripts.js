$(document).ready(function(){

	var windowChange;
	$(window).resize(function(){

		window.clearTimeout(windowChange);
		windowChange = window.setTimeout(function(){
			console.log('resize map');
		}, 500);

	});

	$(".mobile-menu").click(function(){
		$('.navigation').slideToggle();
	});


	var map = L.map('map');
	map.scrollWheelZoom.disable();
	map.locate({ setView: true, watch: true });
	map.on("load", function(){
	  map.setZoom(14);
	});
	L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', {}).addTo(map);


	var popup = L.popup();

	function onMapClick(e) {
		$("#coordinates").val(JSON.stringify(e.latlng));
		popup.setLatLng(e.latlng)
		popup.setContent("You clicked the map at " + e.latlng.toString());
		popup.openOn(map);
	}

	map.on('click', onMapClick);


	$.getJSON('events.json', function(data) {
  	var items = [];
  	$.each(data, function(key, val) {
  		var str = "<a href='/profiles/" + val.user.slug + "'>" + val.user.artist_name + "</a>";
  		L.marker([val.coordinates.lat, val.coordinates.lng]).addTo(map).bindPopup(str).openPopup();
  	});
	});


});