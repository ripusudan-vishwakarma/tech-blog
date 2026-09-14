---
title: "Securing AWS Access for GitHub Actions with HashiCorp Vault"
description: "A practical architecture for replacing long-lived AWS credentials with OIDC, Vault and short-lived AWS credentials."
date: 2026-09-14
category: "DevSecOps"
tags: ["AWS","GitHub Actions","HashiCorp Vault","OIDC"]
draft: false
---
Long-lived cloud credentials inside CI/CD pipelines create an avoidable security risk.

A stronger pattern is to use **GitHub Actions OIDC** with **HashiCorp Vault** and AWS STS to obtain short-lived credentials only when a workflow needs them.

## Architecture

```text
GitHub Actions
      |
     OIDC
      |
      v
HashiCorp Vault
      |
 AWS Secrets Engine
      |
      v
AWS STS / IAM Role
      |
      v
AWS Resources
```

## How it works

1. GitHub Actions obtains an OIDC token for the workflow.
2. Vault validates the token claims and applies its access policy.
3. Vault uses the AWS secrets engine to obtain temporary AWS credentials.
4. The workflow uses those temporary credentials to access the required AWS resources.

## Why this pattern is useful

- No long-lived AWS access keys stored in GitHub Secrets.
- Short-lived credentials reduce the blast radius of credential exposure.
- Access can be restricted by repository, branch or environment.
- Vault provides a central place for policy and credential controls.
- AWS IAM remains responsible for permissions on the target role.

## Conclusion

OIDC + Vault + AWS STS provides a clean architecture for short-lived AWS access from GitHub Actions without relying on permanent AWS keys.