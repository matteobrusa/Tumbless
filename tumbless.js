"use strict";

var startcount = 8;
var actualcount = 0;
var posts = null;
var baseUrl = "public/";
var PREFIX_IMAGES = "images/";
var PREFIX_THUMBNAILS = "thumbnails/";
var PREFIX_VIDEOS = "videos/";
var galleryIndex, galleryList;
var isAdmin = false;

//
// load the config
//

function loadConfig() {
	$.ajax({
		url : baseUrl + "config.json",
		dataType : "json",
		success : function(data) {

			$("#title").html(data.title);
			document.title = data.title;

			$("#description").html(data.description);
		},
		error : function(xhr, ajaxOptions, thrownError) {
			if (window.location.href.startsWith("file://")) {
				alert("This page won't load locally.\nUpload it on a web server first.");
			}
		}
	});
}

function loadPosts() {
	$.ajax({
		url : baseUrl + "posts.json",
		dataType : "json",
		success : function(data) {

			Cookies.set('baseUrl', baseUrl, {
				expires : 64
			});

			loadConfig();

			posts = data;
			if (posts.length > 0) {

				if (posts.length < startcount)
					startcount = posts.length;

				// fill the post list
				for (actualcount = 0; actualcount < startcount; actualcount++) {
					var post = posts[actualcount];

					addPost(post);
				}
			}

			pageReady();
		},
		error : function(xhr, ajaxOptions, thrownError) {

			Cookies.remove('baseUrl');

			if (baseUrl != "public/") {
				$("#wrongPassword").show();
			}

			$("#loginbox").show();
			$("#loginbutton").on("click", function() {
				$("#loginbox").hide();
				loadPrivatePosts($("#password").val());
			});
			$("#password").keypress(function(e) {
				if (e.which == 13) {
					$("#loginbox").hide();
					loadPrivatePosts($("#password").val());
				}
			});
			$("#password").focus();
		}
	});
}

function pageReady() {

	$("#gallery").click(function(e) {
		console.log("gallery click");
		$("#gallery").fadeOut(100);
	});

	if (window.location.href.indexOf("admin") > 0) {

		var pwd = urlParam("admin");
		if (pwd) {
			loadAdmin(pwd);
		} else {

			// get the admin login
			$("#adminbox").show();
			$("#adminbutton").on("click", function() {
				$("#adminbox").hide();
				var pwd = $("#adminpassword").val();
				loadAdmin(pwd);
			});
			$("#adminpassword").keypress(function(e) {
				if (e.which == 13) {
					$("#adminbox").hide();
					var pwd = $("#adminpassword").val();
					loadAdmin(pwd);
				}
			});

			$("#adminpassword").focus();
		}
	}
}

{
	var pwd = Cookies.get('baseUrl');
	if (pwd != null) {
		baseUrl = pwd;
	}
	loadPosts();
}

function loadPrivatePosts(pwd) {
	baseUrl = "private-" + pwd + "/"
	loadPosts();
}

function addPost(post) {

	var template = getTemplate("#postTemplate");

	template.attr("id", post.id);
	$(".posttitle", template).html(post.title);

	$(".postdescription", template).html(post.description);

	var d = new Date(post.date * 1000);
	$(".postdate", template).datepicker();
	$(".postdate", template).datepicker("setDate", d);
	$(".postdate", template).datepicker("disable");

	if (post.draft) { // hide drafts by default
		template.attr("data-draft", true);
		$("input[type=checkbox]", template)[0].checked = true;
		$(".draftwatermark", template).show();

		if (!isAdmin)
			template.hide();
		else {
			$(".articleedit", template).click(onEditArticle);
		}
	}

	var mediacontainer = $(".mediacontainer", template);

	// photo template
	if (post.type == "photo") {

		post.urls = [ post.url ];
		post.type = "photoset";
	}

	// photoset template
	if (post.type == "photoset") {

		var urls = post.urls;

		// load the images
		$.each(urls, function(index, url) {

			var div = getTemplate("#photoTemplate");

			var singlePhoto = urls.length == 1;

			// if (singlePhoto)
			// div.css("float", "none");

			if (index > 0)
				setPhotoSrc(div, url);

			div.attr("data-src", url);
			setGalleryEvent(div, singlePhoto ? null : post.urls);
			mediacontainer.append(div);
		});

		// load first img here
		doLayout(mediacontainer);

		// video template
	} else if (post.type == "video") {

		var a = getTemplate("#videoTemplate");
		$(".src", a).attr("src", baseUrl + "videos/" + post.url);
		a.attr("poster", getImageURL(post.placeholder));

		mediacontainer.append(a);

	}

	$("#posts").append(template);
}

function doLayout(mediacontainer) {

	// remove the img if there
	$("img", mediacontainer).remove();

	// convert the first image
	convertToFirstimage($(".photo", mediacontainer).first(), mediacontainer);
}

function convertToFirstimage(div, mediacontainer) {

	var url = div.attr("data-src");
	if (!url)
		return;

	// get the first to calc the layout
	div.addClass("firstImage");
	var img = $("<img>");
	img.appendTo(div);

	div.css("padding-bottom", "0");

	img.load(function() {
		var w = this.width;
		var h = this.height;
		var photos = $(".photo", mediacontainer);
		layoutPhotoset(photos, w, h)
		img.addClass("firstImageImg");
	});

	if (!url.startsWith("data:image"))
		url = getImageURL(url);
	img.attr("src", url);
}

function layoutPhotoset(divs, w, h) {

	$(divs[0]).css("float", divs.length == 1 ? "none" : "left");

	var aspect = w * 0.995 / h;
	var a, c;

	if (aspect > 1 && (divs.length % 3 == 1)) {
		divs.each(function(index, el) {
			el = $(el);
			if (index == 0)
				el.css("width", "100%");
			else {
				el.css("width", "33.33%");
				el.css("padding-bottom", "33.33%");
			}
		});
	} else if (divs.length == 2) {

		var first = $(divs[0]);
		var img = $("img", first);
		var url = first.attr("data-src");

		img.hide();
		first.removeClass("firstImage");

		setPhotoSrc(first, url);

		divs.css("width", "50%");
		divs.css("padding-bottom", "50%");
	} else if (divs.length % 3 == 0) {
		a = 200 * aspect / (1 + 2 * aspect);
		c = 100 - a;

		divs.each(function(index, el) {
			el = $(el);
			if (index == 0)
				el.css("width", a + "%");
			else if (index < 3) {
				el.css("width", c + "%");
				el.css("padding-bottom", c + "%");
			} else {
				el.css("width", "33.33%");
				el.css("padding-bottom", "33.33%");
			}
		});
	} else if (aspect <= 1 && (divs.length % 3 == 1)) {
		a = 300 * aspect / (1 + 3 * aspect);
		c = 100 - a;

		divs.each(function(index, el) {
			el = $(el);
			if (index == 0)
				el.css("width", a + "%");
			else if (index < 4) {
				el.css("width", c + "%");
				el.css("padding-bottom", c + "%");
			} else {
				el.css("width", "33.33%");
				el.css("padding-bottom", "33.33%");
			}
		});
	} else if (divs.length % 3 == 2) {
		a = 100 * aspect / (1 + aspect);
		c = (100 - a) / 2;

		divs.each(function(index, el) {
			el = $(el);
			if (index == 0)
				el.css("width", a + "%");
			else if (index < 5) {
				el.css("width", c + "%");
				el.css("padding-bottom", c + "%");
			} else {
				el.css("width", "33.33%");
				el.css("padding-bottom", "33.33%");
			}
		});

	}

	divs.css("visibility", "visible");

}

function setPhotoSrc(div, src) {

	if (!src.startsWith("data:image"))
		src = getThumbnailURL(src);

	div.css("background-image", "url(" + src + ")");
}

function getImageURL(src) {
	return baseUrl + PREFIX_IMAGES + src;
}

function getVideoURL(src) {
	return baseUrl + PREFIX_VIDEOS + src;
}

function getThumbnailURL(src) {
	return baseUrl + PREFIX_THUMBNAILS + src;
}

//
// toolbox
//

function getTemplate(type) {
	var template = $(type).clone();
	template.attr("id", null);
	return template;
}

function timestampToStringDate(tstamp) {
	var d = new Date(tstamp * 1000);

	return d.toLocaleDateString();

	// var year = 1900 + d.getYear();
	// var month = d.getMonth() + 1;
	// var day = d.getDate();
	// var hour = d.getHours();
	// var minute = d.getMinutes();
	// var second = d.getSeconds();
	// return day + "/" + month + "/" + year;
}

function dateToTimestamp(date) {
	var d = Date.parse(date);
	return d / 1000;
}

function urlParam(name) {
	var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
	if (results == null) {
		return null;
	} else {
		return results[1] || 0;
	}
}

//
// infinite scrolling
//
window.addEventListener("scroll", function() {

	if (posts) {

		var scrollTop = $(window).scrollTop();
		var docHeight = $(document).height();
		var winHeight = $(window).height();
		var dif = docHeight - winHeight;

		if (scrollTop > dif - winHeight * 2) // a whole window height buffer
		{
			if (actualcount == posts.length)
				console.log("no more posts");
			else {
				var post = posts[actualcount++];
				addPost(post);

			}
		}
	}
});

//
// Gallery
//

function showGallery(src, list) {

	$('#gallery').fadeIn(100);

	$('#galleryImage').css("background-image", "url('" + getThumbnailURL(src) + "')");

	$('#galleryImage').attr("src", null);
	$('#galleryImage').attr("src", getImageURL(src));

	// set the bg URL

	$('#galleryImage').fadeOut(0);
	$('#galleryImage').fadeIn(280);

	$('#galleryImage').swipe(swipeOptions);

	$("#galleryList").empty();

	if (list)
		$.each(list, function(index, url) {
			var tmb = getTemplate("#thumbnail");

			var fullUrl = getImageURL(url);
			var tmbUrl = getThumbnailURL(url);
			tmb.css("background-image", "url(" + tmbUrl + ")");
			tmb.attr("data-src", url);

			$("#galleryList").append(tmb);

			setGalleryEvent(tmb, list);

			if (src.endsWith(url))
				galleryIndex = index;
		});

	galleryList = list;
}

function setGalleryEvent(source, list) {
	source.click(function(e) {

		e.preventDefault();

		var src = $(this).attr("data-src");

		showGallery(src, list);

		return false;
	});
}

function showGalleryFrame() {

	showGalleryDrawer();

	window.setTimeout(hideGalleryDrawer, 2000);
}

function scrollImages(distance, duration) {

	// console.log("scroll by " + distance);

	// inverse the number we set in the css
	var value = (distance < 0 ? "" : "-") + Math.abs(distance).toString();
	$('#galleryImage').css("transform", "translate(" + value + "px,0)");
}

$(document).keydown(function(e) {

	if ($("#gallery").is(':visible')) {
		switch (e.which) {
		case 37: // left
			previousImage();
			break;

		case 39: // right
			nextImage();
			break;

		default:
			return;
		}
		e.preventDefault(); // prevent the default action (scroll / move caret)
	}
});

function previousImage() {
	console.log("previous");
	var gi = Math.max(galleryIndex - 1, 0);

	$('#galleryImage').css("transform", "translate(0px,0)");
	showGallery(galleryList[gi], galleryList);
}

function nextImage() {
	console.log("next");
	var gi = Math.min(galleryIndex + 1, galleryList.length - 1);
	$('#galleryImage').css("transform", "translate(0px,0)");
	showGallery(galleryList[gi], galleryList);
}

function showGalleryDrawer() {

	var abspos = $("#closeGallery")[0].getBoundingClientRect().top;

	var n = 10 - abspos;

	if (n > 0)
		$("#closeGallery").css("transform", "translate(0px," + n + "px)");

	// drawer pos
	var abspos = $("#galleryDrawer")[0].getBoundingClientRect().top;
	var h = $(window).height();
	var glh = $("#galleryList").height();
	var n = h - glh - abspos - 20 - 10;

	if (n < 0)
		$("#galleryDrawer").css("transform", "translate(0px," + n + "px)");
}
function hideGalleryDrawer() {

	$("#closeGallery").css("transform", "translate(0px, 0px)");
	$("#galleryDrawer").css("transform", "translate(0px,0)");
}

$("#galleryDrawer").hover(showGalleryDrawer, hideGalleryDrawer());

$('#galleryImage').click(function(event) {
	// console.log(event);
	event.stopPropagation();
});

var speed = 500;
var threshold = $("body").width() / 10;
var t2 = $("body").height() / 10;
if (t2 < threshold)
	threshold = t2;

var swipeOptions = {
	triggerOnTouchEnd : true,
	swipeStatus : swipeStatus,
	allowPageScroll : "vertical",
	threshold : threshold,
	tap : doTap

};

function doTap(event) {
	event.stopPropagation();
	showGalleryFrame();
}

function swipeStatus(event, phase, direction, distance) {

	event.stopPropagation();

	// If we are moving before swipe, and we are going L or R in X mode, or U or
	// D in Y mode then drag.
	if (phase == "move" && (direction == "left" || direction == "right")) {
		var duration = 1110;

		if (direction == "left") {
			scrollImages(distance, duration);
		} else if (direction == "right") {
			scrollImages(-distance, duration);
		}

	} else if (phase == "cancel") {
		console.log("phase " + phase);
		if (distance < 10) {

			event.preventDefault();
			console.log("You tapped");

		} else
			scrollImages(0, speed);

	} else if (phase == "end") {
		console.log("phase " + phase);

		if (galleryList) {
			if (direction == "right") {
				previousImage();
			} else if (direction == "left") {
				nextImage();
			}
		} else
			scrollImages(0, speed);
	}
}

// the admin trap
function showAdminTrap() {
	$("#adminTrap i").css("top", "0px");

	setTimeout(function() {
		$("#adminTrap i").css("top", "-66px");
	}, 2000);

}
$("#adminTrap").hover(showAdminTrap, null);
$("#adminTrap").click(showAdminTrap, null);

$("#adminTrap i").click(function() {
	location = '?admin';
});
