function loadAdmin(pwd) {

	var url = "admin-" + pwd + ".json";

	$.ajax({
		url : url,
		dataType : "json",
		success : function(data) {

			// here we go
			s3region = data.region;
			s3bucket = data.bucket;

			setS3Credentials(data.credentials);

			testS3();

			$(".editable").attr("contenteditable", "true");

			$("#newPost").show();
			$("#newPost").click(function() {
				newPost();
			});

			$("article i").show();

			$("#publishAction").click(saveChanges);

			$(".drophint").show();

			$(".postdate").datepicker("enable");

			bindActions();

		},
		error : function(xhr, ajaxOptions, thrownError) {

			$("#wrongAdminPassword").show();
			$("#adminbox").show();
			$("#adminpassword").focus();
		}
	});
}

function bindActions() {

	$(".editable").unbind("focusout");
	$(".editable").focusout(function() {
		confirmEdit($(this));
	});

	$("article i[class*='deletearticle']").unbind("click");
	$("article i[class*='deletearticle']").click(function() {
		deletearticle($(this));
	});

	$("article .photo i").unbind("click");
	$("article .photo i").click(function() {
		deleteImage($(this));
	});

	$("input").unbind("change");
	$("input").change(function() {
		confirmEdit($(this));
	});

	$("article").each(function(index, article) {
		bindDropArea(article);
	});
}

function flagPendingChanges() {
	$("body i").show();
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
		buildAndStorePost(articleId, article);
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

	flagPendingChanges();

	bindActions();
}

function deletearticle(i) {

	var article = i.parents("article");
	var articleId = article.attr("id");

	if (articleId) {
		article.remove();
		delPost(articleId);
		flagPendingChanges();
	}
}

function deleteImage(i) {

	var article = i.parents("article");
	var articleId = article.attr("id");

	if (articleId) {

		i.parent().remove();
		buildAndStorePost(articleId, article);

		layoutAgainPhotoset(article);
	}
}

function layoutAgainPhotoset(article) {

	var mc = $(".mediacontainer", article);
	doLayout(mc);
}

function buildAndStorePost(articleId, article) {
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

	flagPendingChanges();
}

function uploadPosts(callback) {
	uploadJson("posts.json", JSON.stringify(posts), callback);
}

function uploadJson(filename, sJson, callback) {
	s3Upload(baseUrl + filename, "application/json", sJson, callback);
}

function uploadImage(filename, blob, callback) {
	s3Upload(baseUrl + "images/" + filename, "image/jpeg", blob, callback);
}

function putPost(post) {

	// TODO: date-aware insertion and update

	for (var i = 0; i < posts.length; i++) {

		var p = posts[i];
		if (p.id == post.id) {
			posts[i] = post; // update
			return;
		}
	}

	posts.unshift(post); // new post
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

/* canvas stuff */

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

		var canvas = $("<canvas>")[0];// getTemplate("#canvasTemplate");

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
			photo.attr("data-src", data); // for the time being, will replace
			// upon
			// upload
			var filename = $.datepicker.formatDate("yymmdd", new Date()) + "_"
					+ src.name;
			var blob = dataURItoBlob(data);
			console.log("uploading " + filename);
			uploadImage(filename, blob, function() {
				console.log("uploaded " + filename);

				photo.attr("data-src", filename);

				var urls = [];
				$(".photo", article).each(function(index, el) {
					urls.push($(el).attr("data-src"));
				});

				setGalleryEvent(photo, urls);

				// completeUpload(photo, filename);
			});

			doLayout($(".mediacontainer", article));
		};
		image.src = e.target.result;

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

function download(filename, href) {
	$("<a />", {
		"download" : filename,
		"href" : href
	}).appendTo("body").click(function() {
		$(this).remove()
	})[0].click();
}

/* drag and rop */

function dragoverListener(e) {
	e.preventDefault();
}
function dropListener(e) {
	e.preventDefault();

	var article = e.currentTarget;

	$.each(e.dataTransfer.files, function(index, img) {
		loadImage(img, article);
	});
}

function bindDropArea(article) {

	article.removeEventListener("dragover", dragoverListener);
	article.addEventListener("dragover", dragoverListener, true);

	article.removeEventListener("drop", dropListener);
	article.addEventListener("drop", dropListener, true);
}
