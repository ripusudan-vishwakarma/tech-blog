\--
## Introduction

Long-lived AWS credentials in CI/CD pipelines create unnecessary security risk and operational overhead.

A better approach is to use **GitHub Actions OpenID Connect (OIDC)** with **HashiCorp Vault** to authenticate workflows and provide temporary AWS credentials.

The high-level flow is:

**GitHub Actions → OIDC → HashiCorp Vault → AWS STS → AWS Resources**

This removes the need to store permanent AWS access keys in GitHub Secrets.

## Architecture

![Secure AWS Access for GitHub Actions using HashiCorp Vault](/tech-blog/images/github-action-vault.png)

The flow is straightforward:

1. GitHub Actions starts a workflow.
2. GitHub issues an OIDC token for the workflow.
3. The workflow authenticates to HashiCorp Vault using the token.
4. Vault validates the workflow identity and applies its policies.
5. Vault obtains temporary AWS credentials using its AWS Secrets Engine.
6. GitHub Actions uses those credentials to access the required AWS resources.
7. The credentials expire after their configured lifetime.

## Why avoid long-lived AWS credentials?

A traditional setup often involves creating an AWS access key and storing it as a GitHub Secret.

For example:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

Even when protected by GitHub Secrets, these credentials are still long-lived.

If they are exposed, they may remain usable until they are manually rotated or revoked. They also introduce additional work around credential storage, rotation, revocation, and repository-specific access.

With OIDC and temporary credentials, the workflow can obtain access only when it needs it.

## GitHub Actions OIDC

GitHub Actions can issue an OIDC token containing information about the workflow and repository.

Vault can validate this token using its JWT/OIDC authentication method and use claims such as:

- Repository
- Organization
- Branch
- Environment
- Workflow identity

This allows authentication policies to be tied to the identity of the workflow rather than a static AWS access key.

For example, access can be restricted so that only a specific repository or production workflow can authenticate.

## Getting temporary AWS credentials

After successful authentication, Vault can use the **AWS Secrets Engine** to generate or obtain temporary AWS credentials based on its configured AWS roles and policies.

The workflow receives credentials such as:

```text
Access Key ID
Secret Access Key
Session Token
```

These credentials have a limited lifetime and expire automatically.

The workflow can then use them for operations such as:

- Deploying applications
- Pushing images to Amazon ECR
- Updating Amazon ECS services
- Managing Amazon S3 resources
- Running infrastructure changes

## Least-privilege access

Short-lived credentials are only one part of the security model.

The AWS IAM role used by the workflow should follow the **principle of least privilege**.

If a workflow only needs to push an image to Amazon ECR, it should not receive broad permissions across the AWS account.

This creates two important controls:

**Authentication** — Vault controls who can obtain credentials.

**Authorization** — AWS IAM controls what those credentials can do.

## Security benefits

Using GitHub Actions OIDC with Vault provides several benefits:

- **No long-lived AWS access keys** stored in GitHub Secrets
- **Short-lived credentials** that expire automatically
- **Centralized access control** through Vault
- **Fine-grained IAM permissions**
- **Better auditability** of authentication and access
- **Reduced credential rotation overhead**

## Things to consider

This architecture also introduces components that need to be designed and operated correctly.

Consider:

- Vault availability and reliability
- Restrictive OIDC authentication policies
- Least-privilege AWS IAM roles
- Appropriate token and credential lifetimes
- Audit logging and monitoring

The exact implementation should be designed according to the organization's CI/CD architecture and security requirements.

## Conclusion

Moving away from long-lived AWS credentials is an important step toward more secure CI/CD pipelines.

**GitHub Actions OIDC + HashiCorp Vault + AWS IAM/STS** provides a model where workflows authenticate dynamically and receive temporary credentials based on their identity and required permissions.

The key principles are simple:

**Authenticate dynamically → Authorize explicitly → Use temporary credentials → Apply least privilege → Audit access**

Secure. Automate. Build a Better Cloud.
