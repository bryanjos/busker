var map = L.map('map');
map.scrollWheelZoom.disable();
map.locate({ setView: true, watch: true });
map.on("load", function(){
    map.setZoom(14);
});

L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', {}).addTo(map);

L.marker([29.949431, -90.069437]).addTo(map).bindPopup("<b>Hello world!</b><br />I am a popup.").openPopup();