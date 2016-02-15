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

		var mc = $(".mediacontainer", article);
		var divs = $("div", mc);
		var img = $("img", divs)[0];

		layoutPhotoset(divs, img.width, img.height);
	}
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
