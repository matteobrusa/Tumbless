# Tumbless
*A Tumblr-like blogging platform living in Amazon S3 (and your browser)*

## Features
- Infinite scrolling
- Automatic photoset layout
- Private, password protected blog
- Fully responsive layout, great for mobile, tablets and desktop
- full screen gallery
- Password protected admin area
 
 
## What doesn't work yet
- Post media from url
- Video posts
- Themes support

## Migrate from Tumblr to your Tumbless instance
To migrate a tumblr blog to Tumbless you can use this [export tool](https://github.com/matteobrusa/TumblrToStaticExporter).

## How to setup your Tumbless instance
##### 1. Create a bucket on Amazon S3
##### 2. Set the CORS permissions as follows, to allow the authenticated admin user to store files:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      <CORSRule>
          <AllowedOrigin>*</AllowedOrigin>
          <AllowedMethod>PUT</AllowedMethod>
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
Restrict it to S3 usage, `PutObject` action, on your blog bucket.
Save the credentials into the `admin.json` file.

##### 5. Configure your blog
Set your blog's title and description in the `config.json` file.

##### 6. [Optional] Make your blog private
Rename the `public` folder to `private-mypassword`.

##### 7. Test your blog
Upload the files to your bucket, which you can reach the blog at your bucket public endpoint, i.e., `mytumblessblog.com.s3-website.eu-central-1.amazonaws.com`.
S3 also supports static hosting on custom domains, très cool.

