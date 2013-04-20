$(document).ready(function(){

	var windowChange;
	$(window).resize(function(){

		window.clearTimeout(windowChange);
		windowChange = window.setTimeout(function(){
			console.log('resize map');
		}, 500);

	});

});