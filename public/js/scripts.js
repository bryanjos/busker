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


    if(window.L){
        var map = L.map('map');
        map.scrollWheelZoom.disable();
        map.locate({ setView: true });
        map.on("load", function(){
          map.setZoom(14);
        });
        L.tileLayer('http://{s}.tile.cloudmade.com/d4fc77ea4a63471cab2423e66626cbb6/997/256/{z}/{x}/{y}.png', {}).addTo(map);


        var popup = L.popup();

        function onMapClick(e) {
            $("#coordinates").val(JSON.stringify(e.latlng));
            popup.setLatLng(e.latlng);
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
    }

    $("#starttime").val(moment().format("MM/DD/YYYY hh:mm A"));
    $("#endtime").val(moment().hours(moment().hour()+1).format("MM/DD/YYYY hh:mm A"));
});

function urlify(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
    });
}
