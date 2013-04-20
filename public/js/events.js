var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', {
	maxZoom: 18
}).addTo(map);


L.marker([51.5, -0.09]).addTo(map)
	.bindPopup("<b>Hello world!</b><br />I am a popup.").openPopup();

var popup = L.popup();

function onMapClick(e) {
	popup
		.setLatLng(e.latlng)
		.setContent("You clicked the map at " + e.latlng.toString())
		.openOn(map);
}

map.on('click', onMapClick);

function get_geo(){
    if(geo_position_js.init()){
        geo_position_js.getCurrentPosition(success_callback,error_callback,{enableHighAccuracy:true});
    }
    else{
        console.log("Functionality not available");
    }

    function success_callback(p)
    {
        geo = { lat: p.coords.longitude, lon: p.coords.latitude };
        $("#coordinates").val(JSON.stringify(geo));
    }

    function error_callback(p)
    {
        console.log('error='+p.message);
    }
}
