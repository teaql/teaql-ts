<!-- ephemeral -->
# KSML Evaluation Report
## 📊 Summary
- **Errors**: 0
- **Warnings**: 6
- **Suggestions**: 2
- **Solids**: 21

## ⚠️ Warnings

| Rule ID | Target | Source | Warning Message |
|---------|--------|--------|-----------------|
| `KSML-OBJECT-002` | `platform._module_key` | `model.xml:2` | Module key 'task_board' on object 'platform' should be lowercase kebab-case. |
| `KSML-OBJECT-002` | `task_status._module_key` | `model.xml:5` | Module key 'task_board' on object 'task_status' should be lowercase kebab-case. |
| `KSML-OBJECT-002` | `task._module_key` | `model.xml:14` | Module key 'task_board' on object 'task' should be lowercase kebab-case. |
| `KSML-OBJECT-002` | `task_execution_log._module_key` | `model.xml:16` | Module key 'task_board' on object 'task_execution_log' should be lowercase kebab-case. |
| `KSML-BUSINESS-002` | `task_execution_log.action` | `model.xml:16` | Field 'action' in business object 'task_execution_log' should preferably use a rich concrete typical value instead of generic string(). |
| `KSML-BUSINESS-002` | `task_execution_log.detail` | `model.xml:16` | Field 'detail' in business object 'task_execution_log' should preferably use a rich concrete typical value instead of generic string(). |


## 💡 Suggestions

| Rule ID | Target | Source | Suggestion |
|---------|--------|--------|------------|
| `KSML-LOG-007` | `task_execution_log` | `model.xml:16` | Object 'task_execution_log' has a name ending with '_log' but is not marked as a logging object. Consider adding _log="true" if this object represents append-only log entries. |
| `KSML-PRIVACY-001-SUG` | `platform.user_email` | `model.xml:4` | Contact identifier field. Add `user_email` to `_audit_mask_fields` (e.g., `<platform _audit_mask_fields="user_email">`). |


## Privacy Findings

These are model-level risk findings and jurisdiction-specific review references, not a compliance certificate.
Field names do not establish legal applicability. Confirm processing purposes, legal bases, retention,
individual rights, cross-border transfers and operational evidence separately. Masking alone is not compliance.
Regional repetitions do not add to the Summary counts. Official references reviewed on 2026-10-13;
check current law and commencement dates before deployment.

### Mainland China — PIPL (Personal Information Protection Law)

PIPL (LAW). Confirm the processing falls within PIPL scope, including its territorial rules.
[Official reference](https://www.gov.cn/xinwen/2021-08/20/content_5632486.htm)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | PIPL: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### Hong Kong — PDPO (Personal Data (Privacy) Ordinance)

PDPO (LAW). Review the applicable data-user duties and six data protection principles.
[Official reference](https://www.pcpd.org.hk/english/data_privacy_law/ordinance_at_a_Glance/ordinance.html)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | PDPO: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### European Union / EEA — GDPR (General Data Protection Regulation)

GDPR (LAW). Confirm GDPR territorial scope and the lawful basis for the actual processing.
[Official reference](https://commission.europa.eu/law/law-topic/data-protection_en)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | GDPR: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### United Kingdom — UK GDPR / Data Protection Act 2018 (UK General Data Protection Regulation and Data Protection Act 2018)

UK GDPR / Data Protection Act 2018 (LAW). Apply the UK framework separately; check applicable Data (Use and Access) Act 2025 amendments.
[Official reference](https://www.gov.uk/guidance/data-use-and-access-act-2025-data-protection-and-privacy-changes)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | UK GDPR / Data Protection Act 2018: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### Switzerland — FADP (Federal Act on Data Protection)

FADP (LAW). Confirm the revised federal law applies; check any additional sector or cantonal requirements.
[Official reference](https://www.edoeb.admin.ch/en/faq-data-protection)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | FADP: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### United States - California — CCPA, as amended by CPRA (California Consumer Privacy Act, as amended by the California Privacy Rights Act)

CCPA, as amended by CPRA (LAW). Confirm covered-business criteria and exemptions. CPRA amends CCPA; this is not a nationwide US law.
[Official reference](https://www.cppa.ca.gov/faq.html)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | CCPA, as amended by CPRA: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### Canada — PIPEDA (Personal Information Protection and Electronic Documents Act)

PIPEDA (LAW). Confirm commercial-activity scope and whether a provincial or sector law applies instead or additionally.
[Official reference](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief/)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | PIPEDA: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### Brazil — LGPD (Lei Geral de Protecao de Dados Pessoais (General Personal Data Protection Law))

LGPD (LAW). Confirm LGPD applicability and the processing basis; field names do not establish either.
[Official reference](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | LGPD: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### Australia — Privacy Act 1988 / Australian Privacy Principles (Privacy Act 1988 and Australian Privacy Principles)

Privacy Act 1988 / Australian Privacy Principles (LAW). Confirm APP-entity coverage and exemptions; not every organisation is covered.
[Official reference](https://www.oaic.gov.au/privacy/privacy-legislation/the-privacy-act)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | Privacy Act 1988 / Australian Privacy Principles: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### India — DPDP Act 2023 / Rules 2025 (Digital Personal Data Protection Act 2023 and Digital Personal Data Protection Rules 2025)

DPDP Act 2023 / Rules 2025 (LAW). Confirm digital-personal-data scope and the commencement date of each provision; implementation is phased.
[Official reference](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | DPDP Act 2023 / Rules 2025: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### Japan — APPI (Act on the Protection of Personal Information)

APPI (LAW). Confirm APPI coverage and the relevant handling and third-party provision requirements.
[Official reference](https://www.ppc.go.jp/en/legal/)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | APPI: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### South Korea — PIPA (Personal Information Protection Act)

PIPA (LAW). Confirm PIPA coverage and the current Korean statutory text and applicable amendments.
[Official reference](https://pipc.go.kr/eng/user/lgp/law/lawsRegulations.do)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | PIPA: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |

### Singapore — PDPA (Personal Data Protection Act)

PDPA (LAW). Confirm organisational coverage, exceptions and which obligations are in force.
[Official reference](https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act/data-protection-obligations)

| Severity | Target | Reason | Recommended Action | Regulatory Basis |
|----------|--------|--------|--------------------|------------------|
| Suggestion | `platform.user_email` | Contact identifier field. | Add to `_audit_mask_fields="user_email"`. | PDPA: review personal-data safeguards and unnecessary exposure in audit logs if the law applies |



## ✅ Solids

| Rule ID | Target | Source | Message |
|---------|--------|--------|---------|
| `KSML-UPLOAD-001` | `` | — | The upload contains 1 files. |
| `KSML-UPLOAD-005` | `` | `model.xml:1` | Resolved entrypoint: model.xml |
| `KSML-XML-002` | `` | `model.xml:1` | The XML document model.xml was parsed successfully. |
| `KSML-ROOT-003` | `` | `model.xml:1` | Root name 'robot-task-board-service' is well-formed. |
| `KSML-ROOT-008` | `` | `model.xml:1` | External JSON business fields use the default camelCase profile. |
| `KSML-OBJECT-001` | `platform` | `model.xml:2` | Object 'platform' defines display name, module, and module key metadata. |
| `KSML-OBJECT-001` | `task_status` | `model.xml:5` | Object 'task_status' defines display name, module, and module key metadata. |
| `KSML-OBJECT-001` | `task` | `model.xml:14` | Object 'task' defines display name, module, and module key metadata. |
| `KSML-OBJECT-001` | `task_execution_log` | `model.xml:16` | Object 'task_execution_log' defines display name, module, and module key metadata. |
| `KSML-CONSTANT-007` | `task_status.id` | `model.xml:5` | Constant object 'task_status' correctly defines id="id()". |
| `KSML-CONSTANT-001` | `task_status` | `model.xml:5` | Constant object 'task_status' has correctly defined constant properties. |
| `KSML-CONSTANT-002` | `task_status.platform` | `model.xml:5` | Constant object 'task_status' is correctly associated with the root object. |
| `KSML-CONSTANT-004` | `task_status` | `model.xml:5` | Constant object 'task_status' has 4 constant value records. |
| `KSML-CONSTANT-008` | `task_status` | `model.xml:5` | Every value in constant object 'task_status' explicitly provides every declared constant field. |
| `KSML-REFERENCE-003` | `task_status.platform` | `model.xml:6` | Reference 'platform' in 'task_status' successfully resolves to target object 'platform'. |
| `KSML-REFERENCE-003` | `task.platform` | `model.xml:14` | Reference 'platform' in 'task' successfully resolves to target object 'platform'. |
| `KSML-REFERENCE-003` | `task.status` | `model.xml:14` | Reference 'status' in 'task' successfully resolves to target object 'task_status'. |
| `KSML-REFERENCE-003` | `task_execution_log.task` | `model.xml:16` | Reference 'task' in 'task_execution_log' successfully resolves to target object 'task'. |
| `KSML-MODULE-004` | `task_status` | `model.xml:5` | Constant object 'task_status' is local to business area 'task' and correctly shares its _module_key 'task_board'. |
| `KSML-DOMAIN-ROOT-003` | `` | `model.xml:1` | Exactly one domain root candidate 'platform' was found. |
| `KSML-STATE-001` | `task.status` | `model.xml:14` | Object 'task' is an Aggregate Root candidate with primary state field 'status'. |

