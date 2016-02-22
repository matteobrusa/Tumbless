"use strict";

var s3region, s3bucket, photoSize = 1600, thumbSize = 640, photoQ = 0.85, thumbQ = 0.80;

function loadAdmin(pwd) {

	// recreateThumbnails();

	var url = baseUrl + "admin-" + pwd + ".json";

	$.ajax({
		url : url,
		dataType : "json",
		success : function(data) {

			if (data.photoSize)
				photoSize = data.photoSize;
			if (data.thumbSize)
				thumbSize = data.thumbSize;

			s3region = data.region;
			s3bucket = data.bucket;

			setS3Credentials(data.credentials);

			testS3();

			$("#adminTrap").remove();

			$("#newPost").show();
			$("#newPost").click(function() {
				var newpost = newPost();
				$(".articleedit", newpost).click(onEditArticle);
				$(".articleedit", newpost).click();
			});

			$("#exitAdmin").show();
			$("#exitAdmin").click(function() {
				location = location.pathname.split("?")[0];
			});

			$(".articleactions").css("display", "inline-block");

			$(".articleedit").click(onEditArticle);

		},
		error : function(xhr, ajaxOptions, thrownError) {

			$("#wrongAdminPassword").show();
			$("#adminbox").show();
			$("#adminpassword").focus();
		}
	});
}

function onEditArticle(event) {
	editArticle($(event.target).parents("article"));
}

function editArticle(article) {

	$(".postdate", article).datepicker("enable");
	$(".editable", article).attr("contenteditable", "true");
	$(".drophint", article).show();

	$(".articleedit", article).hide();

	$(".articlesave", article).show();

	$(".articlesave").click(function(event) {

		// save here

		confirmEdit($(this));

		$(".articleedit").show();
		$(".articledelete").hide();
		$(".articlesave").hide();
		$(".drophint", article).hide();
		$(".editable", article).attr("contenteditable", "false");
		$(".postdate", article).datepicker("disable");
		$(".photodelete", article).hide();

	});

	$(".photodelete", article).show();
	$(".photodelete", article).unbind("click");
	$(".photodelete", article).click(function() {
		deleteImage($(this));
	});

	$(".articledelete", article).show();
	$(".articledelete", article).unbind("click");
	$(".articledelete", article).click(function() {
		deletearticle($(this));
	});

	$("input[type=file]").unbind("change");
	$("input[type=file]").change(function() {
		startFileUpload($(this));
	});

	bindDropArea(article[0]);
}

function saveChanges() {
	uploadPosts(function() {
		console.log("saved posts");
	});
}

function confirmEdit(el) {

	var article = el.parents("article");
	var articleId = article.attr("id");

	if (articleId) {

		var v = $("video", article)[0];
		if (v)
			buildAndStoreVideoPost(articleId, article);
		else
			buildAndStorePhotoPost(articleId, article);

	}
}

function newPost() {
	var template = getTemplate("#postTemplate");

	var id = new Date().getTime();
	template.attr("id", id);

	var d = new Date();
	$(".postdate", template).datepicker();
	$(".postdate", template).datepicker("setDate", d);

	var mediacontainer = $(".mediacontainer", template);

	$("#posts").prepend(template);

	var post = {};
	post[id] = id;

	return template;
}

function deletearticle(i) {

	var article = i.parents("article");
	var articleId = article.attr("id");

	if (articleId) {
		article.remove();
		delPost(articleId);
		uploadPosts(function() {
			console.log("saved posts");
		});
	}
}

function deleteImage(i) {

	var article = i.parents("article");
	var articleId = article.attr("id");

	if (articleId) {
		i.parent().remove();
		layoutAgainPhotoset(article);
	}
}

function layoutAgainPhotoset(article) {

	var mc = $(".mediacontainer", article);
	doLayout(mc);
}

function buildAndStoreVideoPost(articleId, article) {
	var post = {};
	post["id"] = articleId;
	post["title"] = $("header", article)[0].innerHTML;
	post["date"] = dateToTimestamp($(".postdate", article)[0].value);
	post["description"] = $("p", article)[0].innerHTML;
	post["type"] = "video";

	var placeholder = $(".mediacontainer", article).attr("data-preview");
	var url = $(".mediacontainer", article).attr("data-video");

	post["url"] = url;
	post["placeholder"] = placeholder;

	// update the big list
	putPost(post);

	console.log("added post " + post);

	uploadPosts(function() {
		console.log("saved posts");
	});
}

function buildAndStorePhotoPost(articleId, article) {
	var post = {};
	post["id"] = articleId;
	post["title"] = $("header", article)[0].innerHTML;
	post["date"] = dateToTimestamp($(".postdate", article)[0].value);
	post["description"] = $("p", article)[0].innerHTML;
	post["type"] = "photoset";

	var urls = [];
	$(".photo", article).each(function(index, el) {
		var src = $(el).attr("data-src");
		urls.push(src);
	})
	post["urls"] = urls;

	// update the big list
	putPost(post);

	console.log("added post " + post);

	uploadPosts(function() {
		console.log("saved posts");
	});
}

function uploadPosts(callback) {
	uploadJson("posts.json", JSON.stringify(posts), callback);
}

function uploadJson(filename, sJson, callback) {
	s3Upload(baseUrl + filename, "application/json", sJson, callback);
}

function uploadImage(prefix, filename, blob, callback) {
	s3Upload(baseUrl + prefix + filename, "image/jpeg", blob, callback);
}

function uploadVideo(filename, mime, data, callback) {
	s3Upload(baseUrl + PREFIX_VIDEOS + filename, mime, data, callback);
}

function putPost(post) {

	// remove if exists
	for (var i = 0; i < posts.length; i++) {
		var p = posts[i];
		if (p.id == post.id) {
			posts.splice(i, 1);
			break;
		}
	}

	// insert at specific date
	if (posts.length > 0) {
		for (var i = 0; i < posts.length; i++) {
			var p = posts[i];
			if (p.date < post.date) {
				posts.splice(i, 0, post); // insert
				return;
			}
		}
	}

	posts.unshift(post);
}

function delPost(postId) {

	// TODO: date-aware insertion and update

	for (var i = 0; i < posts.length; i++) {

		var p = posts[i];
		if (p.id == postId) {
			posts.splice(i, 1); // yank
			return;
		}
	}

	posts.unshift(post);
}

// UI

function addSpinner(div) {
	var spinner = getTemplate("#spinner");
	div.append(spinner);
}

function removeSpinner(div) {
	$("i.fa.fa-cog.fa-spin.fa-4x", div).remove();
}

function recreateThumbnails() {
	$.each(posts, function(index, post) {
		if (post.urls) {
			$.each(post.urls, function(index, src) {

				console.log("creating thumbnail for " + src);

				var url = getImageURL(src);

				scaleAndUploadImageFromUrl(url, null, thumbSize, thumbQ, PREFIX_THUMBNAILS, src,
						function(article, data) {

							console.log("downloaded " + url);

						}, function(photo, filename) {

							console.log("uploaded " + filename);
						});
			});
		} else if (post.url) {

		}
	});
}

/* canvas stuff */

function processImage(src, article, imgSize) {

	// generate photo and thumbnail

	scaleAndUploadImage(src, article, imgSize, photoQ, PREFIX_IMAGES, onImageScaled, onImageUploaded);
	scaleAndUploadImage(src, null, thumbSize, thumbQ, PREFIX_THUMBNAILS, null, null);

}

function onImageScaled(article, data) {
	var photo = getTemplate("#photoTemplate");
	$("figure", article).append(photo);
	addSpinner(photo);

	// for the time being inline image, will replace upon upload
	photo.css("background-image", "url(" + data + ")");
	photo.attr("data-src", data);

	// add the remove listener
	$(".photodelete", photo).show();
	$(".photodelete", photo).click(function() {
		deleteImage($(this));
	});

	doLayout($(".mediacontainer", article));

	return photo;
}

function onImageUploaded(photo, filename) {

	removeSpinner(photo);

	// replace inlined image with proper source, to make gallery work
	photo.attr("data-src", filename);

	// recreate the list of URLs for the gallery
	var article = $(photo).parents("article");
	var urls = [];
	$(".photo", article).each(function(index, el) {
		urls.push($(el).attr("data-src"));
	});

	setGalleryEvent(photo, urls);

}

function scaleAndUploadImage(src, article, imgSize, imgQuality, pathPrefix, cbImageScaled, cbImageUploaded) {

	console.log("scaling " + src.name);

	// Create our FileReader and run the results through the render function.
	var reader = new FileReader();
	reader.onload = function(e) {

		var filename = $.datepicker.formatDate("yymmdd", new Date()) + "_" + src.name;

		scaleAndUploadImageFromUrl(e.target.result, article, imgSize, imgQuality, pathPrefix, filename, cbImageScaled,
				cbImageUploaded);
	};
	reader.readAsDataURL(src);
}

function scaleAndUploadImageFromUrl(url, article, imgSize, imgQuality, pathPrefix, filename, cbImageScaled,
		cbImageUploaded) {

	var image = new Image();
	image.onload = function() {

		var canvas = $("<canvas>")[0];

		if (image.height > imgSize) {
			image.width *= imgSize / image.height;
			image.height = imgSize;
		}
		if (image.width > imgSize) {
			image.height *= imgSize / image.width;
			image.width = imgSize;
		}
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		canvas.width = image.width;
		canvas.height = image.height;
		ctx.drawImage(image, 0, 0, image.width, image.height);

		// compress to jpg and attach to anchor
		var data = canvas.toDataURL("image/jpeg", imgQuality);

		var blob = dataURItoBlob(data);

		// upload to s3
		console.log("uploading " + filename);
		uploadImage(pathPrefix, filename, blob, function() {

			console.log("uploaded " + pathPrefix + filename);

			// callback
			if (cbImageUploaded)
				cbImageUploaded(photo, filename);
		});

		// callback, photo might be null
		if (cbImageScaled)
			var photo = cbImageScaled(article, data);
	};
	image.src = url;
}

function completeUpload(photo, filename) {

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

/*
 * function download(filename, href) { $("<a />", { "download" : filename, "href" : href
 * }).appendTo("body").click(function() { $(this).remove() })[0].click(); }
 */

function processVideo(file, article) {
	showBusyUploading(article, true);
	grabVideoScreenshot(file, article);

}

function grabVideoScreenshot(file, article) {

	var preview = file.name.substring(0, file.name.lastIndexOf('.')) + ".jpg";

	var reader = new FileReader();
	reader.onload = function(e) {

		var videoData = e.target.result;

		// var source = $("#videoVideo source");
		// source.attr("src", e.target.result);

		// var video = $("#videoVideo")[0];
		var jQvideo = $("<video>");
		jQvideo.attr("autoplay", "true");

		var jQsource = $("<source>");
		jQvideo.append(jQsource);
		jQsource.attr("src", videoData);

		var video = jQvideo[0];

		// var canvas = $("#videoCanvas")[0];
		var canvas = $("<canvas>")[0];

		var context = canvas.getContext('2d');

		var w, h;

		video.addEventListener('playing', function() {

			w = video.videoWidth;
			h = video.videoHeight;

			canvas.width = w;
			canvas.height = h;

			setTimeout(function() {
				context.fillRect(0, 0, w, h);
				context.drawImage(video, 0, 0, w, h);

				// stop video and release resources
				video.pause();
				var source = $("#videoVideo source");
				source.attr("src", null);

				var previewData = canvas.toDataURL("image/jpeg", photoQ);
				var blob = dataURItoBlob(previewData);

				// upload to s3
				console.log("uploading preview " + preview);
				uploadImage(PREFIX_IMAGES, preview, blob, function() {

					console.log("uploading video " + file.name);

					var el = getTemplate("#videoTemplate");
					el.attr("poster", previewData);
					var mediacontainer = $(".mediacontainer", article);
					mediacontainer.append(el);

					uploadVideo(file.name, file.type, file, function() {
						showBusyUploading(article, false);

						$(".src", el).attr("src", videoData);

						mediacontainer.attr("data-video", file.name);
						mediacontainer.attr("data-preview", preview);
					});
				});
			}, 1000);
		}, false);

		video.load();
	};
	reader.readAsDataURL(file);

}

function showBusyUploading(article, show) {
	if (show) {
		$(".uploading", article).show();
		$(".drophere", article).hide();
	} else {
		$(".uploading", article).hide();
		$(".drophere", article).show();
	}
}

/* drag and rop */

function dragoverListener(e) {
	e.preventDefault();
}
function dropListener(e) {
	e.preventDefault();

	var article = e.currentTarget;

	$.each(e.dataTransfer.files, function(index, file) {
		// Prevent any non-image file type from being read.
		if (file.type.match(/image.*/)) {
			processImage(file, article, photoSize);
		} else if (file.type.match(/video.*/)) {
			processVideo(file, article);
		}
	});
}

function startFileUpload(obj) {

	var article = $(obj).parents("article");

	$.each(obj[0].files, function(index, file) {

		// Prevent any non-image file type from being read.
		if (file.type.match(/image.*/)) {
			processImage(file, article, photoSize);
		} else if (file.type.match(/video.*/)) {
			processVideo(file, article);
		}

	});
}

function bindDropArea(article) {

	article.removeEventListener("dragover", dragoverListener);
	article.addEventListener("dragover", dragoverListener, true);

	article.removeEventListener("drop", dropListener);
	article.addEventListener("drop", dropListener, true);
}
