# Tumbless
*A Tumblr-like blogging platform living in Amazon S3 (and your browser).*

## Features
Tumbless leverages the capabilities of HTML5 and Amazon S3 to offer a blogging platform without a specialized backend.
- You can create posts with photos and video
- Fully responsive layout, great for mobile, tablets and desktop
- Infinite scrolling
- Automatic photoset layout: photos are arranged automatically according to aspect ratio and number
- Full screen gallery
- Password protected, mobile friendly admin area
- `optional` Private, password protected blog
- Save draft posts
- Automatically set the post date based on the photo's EXIF data, if any

Follow the instructions below to setup your own Tumbless instance.

## How it works
S3 offers pretty good static hosting and a full set of REST APIs to manage and upload content directly from the browser.
Your HTML5 capable browser takes care of:
- photo scaling on upload
- posts management from a JSON object (no need for a DB)
- Video (mp4) upload and thumbnailing posts

## Demo page
Here's a simple, read only [demo page](https://matteobrusa.github.io/Tumbless/). Hover in the top right corner or jump [here](https://matteobrusa.github.io/Tumbless/?admin) to access the admin interface with password `qwerty123`.
No real S3 bucket is associated with this demo, so upload/edit will not work.

## What doesn't work yet
- Post media from url
- Themes support
- Disqus commenting

## Migrate from Tumblr to your Tumbless instance
To migrate a tumblr blog to Tumbless you can use this [export script](https://github.com/matteobrusa/TumblrToStaticExporter).

## How to setup your Tumbless instance
##### 1. Create a bucket on Amazon S3
Enable Static Website hosting, and set the index document to `index.html`.

##### 2. Set the CORS permissions as follows, to allow the authenticated admin user to store files:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
      <AllowedOrigin>*</AllowedOrigin>
      <AllowedMethod>PUT</AllowedMethod>
      <AllowedMethod>POST</AllowedMethod>
      <ExposeHeader>ETag</ExposeHeader>
      <ExposeHeader>x-amz-meta-custom-header</ExposeHeader>
      <AllowedHeader>*</AllowedHeader>
  </CORSRule>
</CORSConfiguration>
```
##### 3. Set the bucket policy to allow static hosting by default:
```json
{
	"Version": "2008-10-17",
	"Statement": [
		{
			"Sid": "AllowPublicRead",
			"Effect": "Allow",
			"Principal": {
				"AWS": "*"
			},
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::my-bucket-name/*"
		}
	]
}
```
##### 4. Create an S3 user with IAM
Save the bucket name and the credentials into the `admin.json` file.

##### 5. Attach this custom policy to it
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1455229604000",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::my-bucket-name/*"
            ]
        }
    ]
}
```

##### 5. Configure your blog
Set your blog's title and description in the `config.json` file.
Set the admin password by renaming the `admin.json` file to `admin-mysecureadminpassword.json`.

##### 6. [Optional] Make your blog private
Rename the `public` folder to `private-mypassword`.

##### 7. Test your blog
Upload the files to your bucket with S3's web interface (s3cmd does not properly recognize MIME types).
You can now reach the blog at your bucket public endpoint, i.e., `mytumblessblog.com.s3-website.eu-central-1.amazonaws.com`.
You can reach the admin page by appending `?admin` to the URL.
S3 also supports static hosting on **custom domains**, très cool.

**If you've read so far, I'd like to hear your feedback. Pull reqs are welcome.**
