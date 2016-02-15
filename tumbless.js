startcount = 8;
actualcount = 0;
posts = null;
baseUrl = "public/";

//
// load the config
//

function loadConfig() {
	$
			.ajax({
				url : baseUrl +"config.json",
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

			Cookies.set('baseUrl', baseUrl);
			
			loadConfig();

			posts = data;
			if (posts.length > 0) {

				if (posts.length < startcount)
					startcount = posts.length;

				// fill the post list
				for (actualcount = 0; actualcount < startcount; actualcount++) {
					addPost(posts[actualcount]);
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
	if (window.location.href.indexOf("admin") > 0) {

		// get the admin login
		$("#adminbox").show();
		$("#adminbutton").on("click", function() {
			$("#adminbox").hide();
			var pwd = $("#adminpassword").val();
			loadAdmin(pwd);
		});
		$("#adminpassword").focus();
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
	if (!post.title)
		$(".posttitle", template).hide();
	// $(".postdate", template).text(timestampToStringDate(post.date));

	$(".postdescription", template).html(post.description);

	var d = new Date(post.date * 1000);
	$(".postdate", template).datepicker();
	$(".postdate", template).datepicker("setDate", d);
	$(".postdate", template).datepicker("disable");

	var mediacontainer = $(".mediacontainer", template);

	// photo template
	if (post.type == "photo") {

		var div = getTemplate("#photoTemplate");
		div.addClass("firstImage");
		var img = $("<img>");
		img.appendTo(div);
		img.addClass("firstImageImg");

		div.css("visibility", "visible");

		img.attr("src", baseUrl + "images/" + post.url);

		div.attr("data-src", post.url);
		setGalleryEvent(div, null);
		mediacontainer.append(div);

		// photoset template
	} else if (post.type == "photoset") {

		var urls = post.urls;

		// load the images
		$.each(urls, function(index, url) {

			var div = getTemplate("#photoTemplate");

			setPhotoSrc(div, url);

			div.attr("data-src", url);
			setGalleryEvent(div, post.urls);
			mediacontainer.append(div);
		});

		// load first img here
		doLayout(mediacontainer);

		// video template
	} else if (post.type == "video") {

		var a = getTemplate("#videoTemplate");
		$(".src", a).attr("src", baseUrl + "videos/" + post.url);
		a.attr("poster", baseUrl + "images/" + post.placeholder);

		mediacontainer.append(a);

	}

	$("#posts").append(template);
}

function doLayout(mediacontainer) {

	// remove the img if there

	// convert the first image
	convertToFirstimage($(".photo", mediacontainer).first(), mediacontainer);
}

function convertToFirstimage(div, mediacontainer) {
	// get the first to calc the layout
	div.addClass("firstImage");
	var img = $("<img>");
	img.appendTo(div);

	img.load(function() {
		var w = this.width;
		var h = this.height;
		var photos = $(".photo", mediacontainer);
		layoutPhotoset(photos, w, h)
		img.addClass("firstImageImg");
	});

	var url = div.attr("data-src");

	if (!url.startsWith("data:image"))
		url = baseUrl + "images/" + url;
	img.attr("src", url);
}

function layoutPhotoset(divs, w, h) {

	var aspect = w / h;

	if (aspect > 1 && (divs.length % 3 == 1)) {
		divs.each(function(index, el) {
			el = $(el);
			if (index == 0)
				el.css("width", "100%");
			else {
				el.css("width", "33.3%");
				el.css("padding-bottom", "33.3%");
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
				el.css("width", "33.3%");
				el.css("padding-bottom", "33.3%");
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
				el.css("width", "33.3%");
				el.css("padding-bottom", "33.3%");
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
				el.css("width", "33.3%");
				el.css("padding-bottom", "33.3%");
			}
		});

	}

	divs.css("visibility", "visible");

}

function setPhotoSrc(div, src) {
	div.css("background-image", "url(" + baseUrl + "images/" + src + ")");
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

//
// infinite scrolling
//

$(window).scroll(function() {
	if (posts) {

		var scrollTop = $(window).scrollTop();
		var docHeight = $(document).height();
		var winHeight = $(window).height();
		var dif = docHeight - winHeight;

		if (scrollTop > dif - winHeight * 2) // a whole window height buffer
		{
			if (actualcount == posts.length)
				console.log("no more posts");
			else
				addPost(posts[actualcount++]);
		}
	}
});

//
// Gallery
//

function showGallery(src, list) {

	$('#gallery').fadeIn(100);

	$('#galleryImage').attr("src", src);
	$('#galleryImage').fadeOut(0);
	$('#galleryImage').fadeIn(280);
	$('#galleryImage').swipe(swipeOptions);

	$("#galleryList").empty();

	if (list)
		$.each(list, function(index, url) {
			tmb = getTemplate("#thumbnail");

			// tmb.attr("src", baseUrl + "images/" + url);

			var fullUrl = baseUrl + "images/" + url;
			tmb.css("background-image", "url(" + fullUrl + ")");
			tmb.attr("data-src", fullUrl);

			$("#galleryList").append(tmb);

			/*
			 * var len= list.length; if (len >5) len= 5; tmb.css("max-width",
			 * (100)/len+"%");
			 */

			setGalleryEvent(tmb, list);

			if (src.endsWith(url))
				galleryIndex = index;
		});

	galleryList = list;
}

function setGalleryEvent(source, list) {
	source.click(function(e) {

		e.preventDefault();

		// var img = $("img", this);
		// src = img.attr("src");

		// if (!src)
		src = baseUrl + "images/" + $(this).attr("data-src");

		showGallery(src, list);

		return false;
	});
}

speed = 500;
threshold = $("body").width() / 10;
var t2 = $("body").height() / 10;
if (t2 < threshold)
	threshold = t2;

var swipeOptions = {
	triggerOnTouchEnd : true,
	swipeStatus : swipeStatus,
	allowPageScroll : "vertical",
	threshold : threshold
};

function swipeStatus(event, phase, direction, distance) {

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
			console.log("You tapped");
			$('#gallery').fadeOut(100);
			event.preventDefault();
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

function scrollImages(distance, duration) {

	console.log("scroll by " + distance);

	// $('#galleryImage').css("transition-duration", (duration /
	// 1000).toFixed(1) + "s");

	// inverse the number we set in the css
	var value = (distance < 0 ? "" : "-") + Math.abs(distance / 10).toString();
	$('#galleryImage').css("transform", "translate(" + value + "px,0)");
}

function previousImage() {
	console.log("previous");
	gi = Math.max(galleryIndex - 1, 0);

	$('#galleryImage').css("transform", "translate(0px,0)");
	showGallery(baseUrl + "images/" + galleryList[gi], galleryList);
}

function nextImage() {
	console.log("next");
	gi = Math.min(galleryIndex + 1, galleryList.length - 1);
	$('#galleryImage').css("transform", "translate(0px,0)");
	showGallery(baseUrl + "images/" + galleryList[gi], galleryList);
}

$("#galleryDrawer").hover(function() {
	abspos = $("#galleryDrawer")[0].getBoundingClientRect().top;
	h = $(window).height();

	glh = $("#galleryList").height();
	n = h - glh - abspos - 20 - 10;

	// console.log("abs= " + abspos + " h= " + h + " n: " + n);

	if (n < 0)
		$("#galleryDrawer").css("transform", "translate(0px," + n + "px)");
}, function() {
	$("#galleryDrawer").css("transform", "translate(0px,0)");
});
