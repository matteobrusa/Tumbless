var MAX_SIZE = 1280;

function loadImage(src, article) {

	// Prevent any non-image file type from being read.
	if (!src.type.match(/image.*/)) {
		console.log("The dropped file is not an image: ", src.type);
		return;
	}

	// Create our FileReader and run the results through the render function.
	var reader = new FileReader();
	reader.onload = function(e) {

		var photo = getTemplate("#photoTemplate");
		$("figure", article).append(photo);

		var can = getTemplate("#canvasTemplate");
		//$("figure", article).append(can);

		render(e.target.result, can[0], photo);

		/*
		 * var data= cancan.toDataURL("image/jpeg",0.9); can[0].href = data;
		 * can[0].download=$.datepicker.formatDate("yymmdd", new Date()) +"_"+
		 * src.name; /*can.click(function() {
		 * 
		 * 
		 * });
		 */
	};
	reader.readAsDataURL(src);
}

function render(src, canvas, photo) {
	var image = new Image();
	image.onload = function() {

		if (image.height > MAX_SIZE) {
			image.width *= MAX_SIZE / image.height;
			image.height = MAX_SIZE;
		}
		if (image.width > MAX_SIZE) {
			image.height *= MAX_SIZE / image.width;
			image.width = MAX_SIZE;
		}
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		canvas.width = image.width;
		canvas.height = image.height;
		ctx.drawImage(image, 0, 0, image.width, image.height);

		// compress to jpg and attach to anchor
		var data = canvas.toDataURL("image/jpeg", 0.9);
		
		photo.css("background-image", "url(" + data + ")");
	};
	image.src = src;
}

function dataURItoBlob(dataURI) {
	// convert base64/URLEncoded data component to raw binary data held in a
	// string
	var byteString;
	if (dataURI.split(',')[0].indexOf('base64') >= 0)
		byteString = atob(dataURI.split(',')[1]);
	else
		byteString = unescape(dataURI.split(',')[1]);

	// separate out the mime component
	var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

	// write the bytes of the string to a typed array
	var ia = new Uint8Array(byteString.length);
	for (var i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}

	return new Blob([ ia ], {
		type : mimeString
	});
}

function download(filename, href) {
	$("<a />", {
		"download" : filename,
		"href" : href
	}).appendTo("body").click(function() {
		$(this).remove()
	})[0].click();
}