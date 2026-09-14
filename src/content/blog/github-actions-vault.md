---
title: "Securing AWS Access for GitHub Actions with HashiCorp Vault"
description: "How GitHub Actions OIDC and HashiCorp Vault can be used to provide short-lived AWS credentials for secure CI/CD."
date: 2026-09-14
category: "DevSecOps"
tags:
  - AWS
  - GitHub Actions
  - HashiCorp Vault
  - OIDC
  - DevSecOps
  - Cloud Security
draft: false
---

Long-lived AWS credentials in CI/CD pipelines can create unnecessary security risks.

A more secure approach is to use **GitHub Actions OpenID Connect (OIDC)** with **HashiCorp Vault** to provide short-lived AWS credentials when a workflow runs.

The basic idea is:

**GitHub Actions → OIDC → HashiCorp Vault → AWS STS → AWS Resources**

This removes the need to store long-lived AWS access keys in GitHub Secrets and provides better control over how CI/CD workflows access AWS.

## Architecture

The following architecture shows the authentication and credential flow:

![Secure AWS Access for GitHub Actions using HashiCorp Vault](/tech-blog/images/github-action-vault.png)

### High-level flow

```text
GitHub Actions
      |
      | OIDC Token
      v
HashiCorp Vault
      |
      | Assume IAM Role
      v
AWS STS
      |
      | Temporary AWS Credentials
      v
AWS Resources
```

## Why avoid long-lived AWS credentials?

A common way of configuring AWS access for GitHub Actions is to create an IAM access key and store it as a GitHub Secret.

For example:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

Although GitHub Secrets protect the values from being displayed directly, the credentials themselves remain long-lived.

If those credentials are exposed or compromised, they may remain usable until they are manually rotated or revoked.

This creates additional operational and security overhead:

- Credentials need to be securely stored.
- Credentials need to be rotated periodically.
- Access needs to be manually revoked when no longer required.
- Different repositories may require different credentials.
- Maintaining consistent access controls becomes harder as the number of repositories grows.

A better approach is to avoid distributing permanent AWS credentials wherever possible.

## GitHub Actions OIDC

GitHub Actions supports OpenID Connect (OIDC), allowing a workflow to authenticate with an external identity provider without storing a long-lived cloud credential.

When a workflow runs, GitHub can issue an OIDC token containing information about the workflow and repository.

Conceptually:

```text
GitHub Actions
      |
      | OIDC Token
      v
HashiCorp Vault
```

Vault can validate the token and determine whether the workflow is trusted.

## How the authentication flow works

### 1. GitHub Actions starts the workflow

A GitHub Actions workflow can be triggered by events such as:

```text
push
pull_request
workflow_dispatch
```

The workflow requires access to AWS resources to perform tasks such as deployment or infrastructure changes.

Instead of using a static AWS access key, the workflow requests an OIDC token from GitHub.

```text
GitHub Actions
      |
      v
OIDC Token
```

### 2. GitHub sends the OIDC token to Vault

The workflow uses the GitHub OIDC token to authenticate with HashiCorp Vault.

```text
GitHub Actions
      |
      | OIDC JWT
      v
HashiCorp Vault
```

Vault validates the token using its configured JWT/OIDC authentication method.

Vault policies can then determine whether the workflow is allowed to authenticate and what it is allowed to access.

### 3. Vault validates the workflow identity

The OIDC token contains claims that can be used to establish trust.

Depending on the configuration, access can be restricted based on attributes such as:

- Repository
- Organization
- Branch
- Environment
- Workflow identity

For example:

```text
Repository A
    |
    +-- Production deployment -> Allowed
    |
    +-- Other AWS resources   -> Denied
```

The exact policy should depend on the organization's security requirements.

## 4. Vault obtains AWS credentials

After successful authentication, Vault can use its AWS Secrets Engine to generate or obtain temporary AWS credentials based on its configured AWS role and policies.

Conceptually:

```text
GitHub Actions
      |
      | Authenticated request
      v
HashiCorp Vault
      |
      | AWS Secrets Engine
      v
AWS
```

The resulting AWS credentials are temporary rather than permanent.

## 5. Temporary credentials are returned

The workflow receives temporary AWS credentials such as:

```text
Access Key ID
Secret Access Key
Session Token
```

These credentials have a limited lifetime.

The workflow can then use them for the required deployment or AWS operations.

```text
Vault
  |
  | Temporary credentials
  v
GitHub Actions
```

The credentials expire after their configured lifetime.

## 6. GitHub Actions deploys to AWS

The workflow can now use the temporary credentials to interact with AWS.

For example:

```text
GitHub Actions
      |
      +-- Amazon ECR
      +-- Amazon ECS
      +-- Amazon S3
      +-- CloudFormation
      +-- Other AWS services
```

The workflow does not need a permanent AWS access key stored in GitHub Secrets.

## Least-privilege access

Short-lived credentials alone are not enough.

The AWS IAM permissions assigned to the workflow should also follow the **principle of least privilege**.

For example, if a workflow only needs to push images to Amazon ECR, it should not automatically receive broad permissions across the AWS account.

A simplified model could look like:

```text
GitHub Actions
      |
      v
HashiCorp Vault
      |
      v
AWS IAM Role
      |
      +-- ECR
      +-- Required deployment permissions
```

The IAM role should contain only the permissions required for the workload.

This gives us two important security controls:

```text
Authentication
      +
Authorization
```

Vault controls who can obtain credentials, while AWS IAM controls what those credentials can actually do.

## Why HashiCorp Vault?

HashiCorp Vault can provide a centralized layer for authentication, secrets management, and access control.

In a larger organization, this can be useful when multiple CI/CD systems and repositories need controlled access to cloud resources.

Some benefits include:

- Centralized authentication
- Centralized secrets management
- Fine-grained access policies
- Short-lived credentials
- Integration with cloud IAM
- Audit logging
- Reduced dependency on static credentials

Instead of distributing long-lived credentials across multiple repositories, access can be managed through a centralized system.

## Security benefits

### No long-lived AWS access keys

The workflow does not need a permanent AWS access key stored as a GitHub Secret.

### Short-lived credentials

AWS credentials are temporary and expire automatically.

This reduces the window of opportunity if credentials are accidentally exposed.

### Centralized access control

Vault provides a central point for authentication and policy management.

### Least-privilege permissions

AWS IAM roles can restrict the actions available to the CI/CD workflow.

### Better auditability

Authentication and access activity can be logged and reviewed.

### Reduced credential rotation overhead

Because the workflow uses temporary credentials, there is less reliance on manually rotating permanent access keys.

## Example CI/CD flow

A simplified CI/CD workflow can follow this pattern:

```text
1. Workflow triggered
        |
        v
2. GitHub generates OIDC token
        |
        v
3. Authenticate with Vault
        |
        v
4. Vault validates OIDC token
        |
        v
5. Vault applies access policy
        |
        v
6. Vault obtains temporary AWS credentials
        |
        v
7. Temporary credentials returned to workflow
        |
        v
8. GitHub Actions deploys to AWS
        |
        v
9. Credentials expire
```

The important point is that the workflow receives access only when it needs it.

## Traditional vs OIDC + Vault

| Traditional approach | OIDC + Vault |
| --- | --- |
| Long-lived AWS access keys | Temporary AWS credentials |
| Credentials stored in GitHub Secrets | No permanent AWS keys required |
| Manual credential rotation | Credentials expire automatically |
| Repository-specific static credentials | Centralized authentication |
| Higher impact if credentials leak | Limited credential lifetime |
| IAM access-key based | Identity and policy based |

## Things to consider

This architecture also introduces additional components that need to be designed and operated correctly.

For example:

- Vault availability needs to be considered.
- Vault authentication policies must be carefully designed.
- AWS IAM roles must follow least privilege.
- OIDC trust configuration must be restricted appropriately.
- Token and credential lifetimes should be configured according to the workload.
- Audit logging should be enabled and monitored.

Security controls should be designed based on the actual CI/CD architecture and organizational requirements.

## Final architecture

Putting everything together:

```text
                    +----------------------+
                    |    GitHub Actions    |
                    |                      |
                    |    CI/CD Workflow    |
                    +----------+-----------+
                               |
                               | OIDC Token
                               v
                    +----------------------+
                    |   HashiCorp Vault    |
                    |                      |
                    | OIDC Authentication  |
                    | Access Policies      |
                    | AWS Secrets Engine   |
                    +----------+-----------+
                               |
                               | Assume IAM Role
                               v
                    +----------------------+
                    |       AWS STS        |
                    |                      |
                    | Temporary Credentials|
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |    AWS Resources     |
                    |                      |
                    | ECR · ECS · S3 ·     |
                    | CloudFormation · etc |
                    +----------------------+
```

## Conclusion

Moving away from long-lived AWS credentials is an important step toward more secure CI/CD pipelines.

Using **GitHub Actions OIDC + HashiCorp Vault + AWS IAM/STS** provides a model where workflows can authenticate dynamically and receive temporary credentials based on their identity and required permissions.

The key principles are:

```text
Authenticate dynamically
          |
          v
Authorize explicitly
          |
          v
Use temporary credentials
          |
          v
Apply least privilege
          |
          v
Audit access
```

For modern DevSecOps platforms, this approach can significantly reduce the risks associated with distributing and managing long-lived cloud credentials.

---

**Secure. Automate. Build a Better Cloud.**
