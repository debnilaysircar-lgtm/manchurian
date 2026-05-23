export interface AmsNode {
  text: string;
  ref?: string;
  children?: AmsNode[];
}
export interface AmsSection {
  section: string;
  color: string;
  tree: AmsNode[];
}

export const AMS_ARCHITECTURE: AmsSection[] = [
  {
    section: "SAP Basis",
    color: "#f97316",
    tree: [
      { text: "Runtime Architecture – Basis Perspective", children: [
        { text: "Channel Support & Presentation Layer", ref: "Runtime Architecture › Channel support capabilities", children: [
          { text: "Web & Mobile Channel Enablement", ref: "Runtime Architecture › Owned Digital channels", children: [
            { text: "SAP Web Dispatcher (Large/Small screen Web routing)" },
            { text: "SAP Fiori / UI5 App Server (PC/Laptop & Mobile apps)" },
            { text: "SAP ICM – Internet Communication Manager (HTTP/S gateway)" },
          ]},
          { text: "Rendering & Session Management", ref: "Runtime Architecture › Rendering and interaction capabilities", children: [
            { text: "SAP GUI & Logon Group Configuration" },
            { text: "ICF Service Activation & URL Routing" },
            { text: "SAP Spool & Output Management (Document/page generation)" },
            { text: "SAP Notification Framework (bgRFC / push channels)" },
          ]},
          { text: "Localisation & Multi-Channel Adaptation", ref: "Runtime Architecture › Presentation adaptation capabilities", children: [
            { text: "SAP Language & Locale Transport Management" },
            { text: "SAP Content Server Administration" },
          ]},
        ]},
        { text: "Processing & Logic Execution", ref: "Runtime Architecture › Processing and logic execution capabilities", children: [
          { text: "ABAP Application Server & Work Process Management", children: [
            { text: "Custom Code Execution – ABAP Runtime & Kernel" },
            { text: "Workflow Engine (SAP Business Workflow / BRF+)" },
            { text: "Event Correlation & bgRFC Queue Management" },
          ]},
          { text: "Execution Control & Failure Management", children: [
            { text: "Update Task & LUW Transaction Management (SM13)" },
            { text: "System Log & ABAP Dump Analysis (SM21/ST22)" },
            { text: "Restart/Recovery – Update Records & Batch Restart" },
            { text: "Runtime Profiling – ABAP Trace (SAT/SE30)" },
          ]},
          { text: "Process Timing & Scheduling", children: [
            { text: "Dialog / Online Processing – Work Process Configuration" },
            { text: "Background Job Scheduling – SM36/SM37" },
            { text: "qRFC / tRFC Queue Management (SMQ1/SMQ2)" },
            { text: "Real-time Processing – Event-driven RFC & IDoc Posting" },
            { text: "Stream Processing – SAP Event Mesh / Advanced Event Mesh" },
          ]},
          { text: "Execution Partitioning & High Availability", children: [
            { text: "SAP Application Server Clustering (ASCS/ERS)" },
            { text: "SAP Logon Load Balancing & Message Server" },
            { text: "SAP HA Failover – Pacemaker / SIOS Configuration" },
            { text: "Parallel Processing – Parallel Cursor & RFC Work Partitioning" },
            { text: "Multi-Version Parallel Execution – SUM NZDT Shadow Repo" },
          ]},
          { text: "Data Management & Integration at Runtime", children: [
            { text: "SAP Buffer & Table Access Tuning (SM50/ST05)" },
            { text: "ABAP Data Encoding & Code Page Management (SNLS)" },
            { text: "HANA Data Persistence – Savepoints & Log Volumes" },
            { text: "Data Versioning – HANA Redo Log & ABAP Change Documents" },
            { text: "RFC / BAPI / IDoc Transport & Delivery" },
            { text: "ALE Distribution & Replication (BD64 / SALE)" },
            { text: "Report Generation – SAP Spool & BW Batch Reports" },
          ]},
        ]},
      ]},
      { text: "Dev & Operations – Basis Perspective", children: [
        { text: "Project & Release Planning", children: [
          { text: "SAP Scope & Release Planning (CTS+ / TMS Routes)" },
          { text: "SAP Landscape Risk Register – Security & Kernel Risks" },
          { text: "Basis Progress Tracking – SolMan Roadmap / Cloud ALM Dashboard" },
          { text: "Change & Transport Control – ChaRM Approval Workflow" },
          { text: "Capacity Forecasting – HANA Memory & CPU Modelling" },
        ]},
        { text: "Build, Test & Deployment", children: [
          { text: "ABAP Workbench / ADT – Code & Config Writing" },
          { text: "SAP Basis Infrastructure-as-Code (Ansible / Terraform for SAP)" },
          { text: "SUM & SAINT – Software Update & Add-on Installation" },
          { text: "CTS+ Continuous Integration with SAP CI/CD Pipeline" },
          { text: "SAP Test Automation – CBTA / TAO (Basis infrastructure layer)" },
          { text: "Security Testing – Vulnerability Scans & SAP Penetration Test" },
        ]},
        { text: "Software Configuration & Release Management", children: [
          { text: "TMS – Transport Routes, Queues & Version Management" },
          { text: "SAP CD Pipeline – Cloud ALM / Jenkins Integration" },
          { text: "SWPM & SAP Software Provisioning (Artefact management)" },
          { text: "Release Management – ChaRM / Cloud ALM Release Cycles" },
          { text: "Deployment Orchestration – SUM, SAINT, Import Scheduler" },
          { text: "Software Distribution – SAP Download Manager / Maintenance Planner" },
          { text: "VM & Container Management – SAP on Docker/Kubernetes (BTP, Kyma)" },
        ]},
        { text: "Environment Management", children: [
          { text: "DEV & Unit Test Environments – ABAP Client Strategy" },
          { text: "System / Integration Test Environments – QAS Landscape" },
          { text: "UAT & Performance Test Environments – Pre-PRD" },
          { text: "Operational Readiness Test – Cutover Dress Rehearsal Env" },
          { text: "Production Environments – Live / Pilot / Training Clients" },
          { text: "DR Environment – HANA System Replication (HSR) Site" },
          { text: "Fix Environments – Fast Track / Hot-Fix Maintenance Lane" },
        ]},
        { text: "IT Operations & Asset Management", children: [
          { text: "SAP System Portfolio Governance (SolMan Landscape Management)" },
          { text: "SAP License Measurement & USMM Compliance" },
          { text: "CMDB – SAP System Landscape in SAP LMDB / SLD" },
          { text: "Service Continuity – HA/DR Run-book & Availability Management" },
          { text: "Basis SLA & Incident SLA Management" },
          { text: "Service Desk Integration – SolMan ITSM / ServiceNow Connector" },
          { text: "IT Risk & Continuous Improvement Management" },
        ]},
        { text: "IT Operations Management", children: [
          { text: "SAP System & Host Monitoring – SolMan / Cloud ALM / CCMS" },
          { text: "SAP Server & OS Configuration Management (RZ10/RZ20)" },
          { text: "Backup, Restore & Archival – HANA Backup & Data Archiving" },
          { text: "Automation & Scheduling – SAP Job Scheduling Service (JSS)" },
          { text: "Capacity Planning & Performance Tuning – DB02/ST05/OS07" },
          { text: "Performance Modelling – Workload Monitor & Early Watch Alert" },
          { text: "Semantic Monitoring – Business Process Monitoring (BPMon)" },
        ]},
        { text: "Data Management", children: [
          { text: "SAP Master Data Governance (MDG) – Technical Layer" },
          { text: "SAP Data Quality – HANA Data Profiling & Cleansing" },
          { text: "Data Archiving – SAP ILM & Archivelink Administration" },
          { text: "Audit Trail Management – Change Document & SLG1 Log Objects" },
          { text: "Data Migration – HANA DMO & SAP LT Replication Server (SLT)" },
        ]},
      ]},
      { text: "Infrastructure – Basis Perspective", children: [
        { text: "Computing Components", children: [
          { text: "SAP Application Servers – Physical / VM Sizing (SAPS)" },
          { text: "SAP HANA Appliance / TDI Server Configuration" },
          { text: "SAP End-User Devices – SAP GUI & Fiori Client Config" },
          { text: "Embedded SAP Systems – IoT / Edge Integration (BTP IoT)" },
        ]},
        { text: "Network & Storage", children: [
          { text: "SAP Network Segmentation – Firewalls, Routers & VLANs for SAP" },
          { text: "SAP Load Balancer & Web Dispatcher Network Config" },
          { text: "Intrusion Prevention for SAP Networks (IPS/IDS)" },
          { text: "SAP HANA Storage – SAN / NAS Sizing & I/O Configuration" },
          { text: "SAP Backup Storage – Tape / Object Store Volumes" },
        ]},
        { text: "Data Centre & Facilities", children: [
          { text: "SAP Data Centre Capacity & Rack Planning" },
          { text: "Physical Security for SAP Server Rooms" },
          { text: "Power & Cooling for SAP HANA Infrastructure (HVAC/UPS)" },
        ]},
      ]},
      { text: "Platforms – Basis Perspective", children: [
        { text: "Presentation & Web Platform Components", children: [
          { text: "SAP Web Dispatcher – Proxy, Cache & SSO Software" },
          { text: "SAP NetWeaver Portal / Launchpad Server Software" },
          { text: "SAP Fiori Launchpad – Multi-Channel Framework" },
        ]},
        { text: "Logic Execution Platform", children: [
          { text: "SAP Workflow Engine & BPM (Business Rule Engine)" },
          { text: "SAP ABAP Application Server Software (AS ABAP)" },
          { text: "SAP Java AS (J2EE Engine) – PI/PO, EP Stack Management" },
          { text: "ABAP Batch Frameworks & Utility Library Administration" },
        ]},
        { text: "Integration Platform", children: [
          { text: "SAP Process Integration / Process Orchestration (PI/PO) – ESB" },
          { text: "SAP Integration Suite (CPI) – API Management & Adapters" },
          { text: "Managed File Transfer – SAP MFT / SFTP Server" },
          { text: "SAP Event Mesh – EDA / CEP Server Administration" },
          { text: "SAP Service Registry & Endpoint Management" },
          { text: "ETL Infrastructure – SAP SLT / BW Process Chains" },
        ]},
        { text: "Data, Reporting & Storage Platforms", children: [
          { text: "SAP BW/4HANA – Data Warehouse Platform Administration" },
          { text: "SAP HANA DB – In-Memory, RDBMS & Column Store Admin" },
          { text: "SAP MDM / MDG Server Software" },
          { text: "SAP Content Repository & Archivelink (ECM)" },
          { text: "SAP HANA Dynamic Tiering & Data Caching Layer" },
          { text: "SAP File Server & GIS Integration (HANA Spatial)" },
        ]},
        { text: "Operating System & Cloud Infrastructure", children: [
          { text: "SAP-Certified Server OS – RHEL / SLES for SAP Administration" },
          { text: "SAP Client OS – Windows / macOS SAP GUI & Fiori Config" },
          { text: "SAP BTP Cloud Management – Subaccount, Entitlements, Services" },
          { text: "SAP on IaaS – AWS / Azure / GCP VM & Storage Management" },
        ]},
      ]},
      { text: "Data & Applications – Basis Perspective", children: [
        { text: "Data Management", children: [
          { text: "SAP Data Governance – Landscape Data Policies & SLD Standards" },
          { text: "SAP Data Lifecycle – Archiving, ILM & Data Retirement (SARA)" },
          { text: "SAP Metadata Management – Dictionary, Repository Objects" },
          { text: "HANA Data Profiling & Cleansing (HANA Smart Data Integration)" },
          { text: "Data Privacy & Retention – ILM Policy Configuration" },
        ]},
        { text: "Application Landscape", children: [
          { text: "SAP ECC / S/4HANA Core – Packaged Application Admin" },
          { text: "SAP SaaS Solutions – BTP SaaS Subscription & Connectivity" },
          { text: "Custom ABAP Applications – Basis Transport & Lifecycle" },
          { text: "SAP PPM & DevOps Tools – Solution Manager / Cloud ALM" },
          { text: "IT Service Management Applications – SAP ITSM" },
        ]},
      ]},
    ],
  },
  {
    section: "SAP Security",
    color: "#a855f7",
    tree: [
      { text: "Runtime Architecture – Security Perspective", children: [
        { text: "Security Enforcement Capabilities", children: [
          { text: "Identification & Authentication", children: [
            { text: "SAP User Identification – SU01 / User Master Records" },
            { text: "SAP Authentication – Password Policies, Certificates, Tokens" },
            { text: "SAP Single Sign-On – SAML 2.0 / Kerberos / SAP SSO 3.0" },
          ]},
          { text: "Identity & Access Management", children: [
            { text: "Authorization – PFCG Role Design & Authorization Objects" },
            { text: "IAM – SAP GRC Access Control / SAP Identity Access Governance" },
            { text: "I&AM Federation – SAP IAS + Azure AD / Okta Trust Setup" },
          ]},
          { text: "Confidentiality & Compliance", children: [
            { text: "Encryption – SNC, SSL/TLS & HANA Data Encryption (SSFS)" },
            { text: "Digital Signature – SAP Document Signing & PDF Certificates" },
            { text: "Transaction Audit & Traceability – SM19/SM20 Security Audit Log" },
            { text: "Compliance Validation – SAP GRC PC / SAP Audit Management" },
          ]},
        ]},
        { text: "Presentation Layer Security", children: [
          { text: "SAP Fiori App Authorization – Catalog & Tile-Level Security" },
          { text: "Input Validation – ABAP Injection Prevention & XSRF Protection" },
          { text: "ICF Service Security – Authorizations for HTTP Endpoints" },
        ]},
      ]},
      { text: "Dev & Operations – Security Perspective", children: [
        { text: "Security in Project & Change Management", children: [
          { text: "Security Scope in Release Planning – Auth Concept per Release" },
          { text: "Security Risk Register – GRC Risk Management Integration" },
          { text: "Security Change Control – Auth Object Review per Transport" },
        ]},
        { text: "Security Testing", children: [
          { text: "Security Test Enablement – ABAP Code Vulnerability Scanner (ATC)" },
          { text: "Authorization Testing – SU53 / SU24 Trace-Based Test Coverage" },
          { text: "Penetration Testing & SAP Security Benchmarking (CIS SAP)" },
        ]},
        { text: "Quality & Knowledge Management", children: [
          { text: "SAP Security Review & RSAT Static Analysis" },
          { text: "Security Defect Tracking – GRC Issue Remediation Workflow" },
          { text: "Security Policies & Standards – Auth Concept Documentation" },
          { text: "SAP Security Knowledge Base – SAP Security Notes Repository" },
        ]},
        { text: "IT Operations – Security Operations", children: [
          { text: "SAP Security Patch Management – Monthly Security Notes (SNOTE)" },
          { text: "User Profile & IAM Operations – SU10, CUA, GRC ARM Requests" },
          { text: "SAP System Hardening – Profile Parameters & Baseline Config" },
          { text: "Threat Detection – SAP ETD (Enterprise Threat Detection) / SIEM" },
          { text: "Security Monitoring – SAP ETD, SM19/SM20, SIEM Integration" },
          { text: "Antivirus & Malware Management – SAP Virus Scan Interface (VSI)" },
        ]},
        { text: "Data Management – Security Perspective", children: [
          { text: "Information Security Management – Data Classification in SAP" },
          { text: "Audit Trail & Log Management – SLG1, SM20, STAD Security Logs" },
          { text: "Data Retention Governance – ILM Policies per Legal Entity" },
          { text: "Data Privacy – SAP DPP (Data Privacy Integration) & GDPR Tools" },
        ]},
        { text: "IT Asset & Service – Security Perspective", children: [
          { text: "Security Compliance Management – GRC PC / Audit Universe" },
          { text: "Security SLA – Access Provisioning SLAs in GRC ARM" },
          { text: "Security Risk Management – IT Risk Register in GRC RM" },
          { text: "Security Incident & Problem Management – ITSM Security Queue" },
        ]},
      ]},
      { text: "Infrastructure – Security Perspective", children: [
        { text: "Network Security Components", children: [
          { text: "Firewall Rules for SAP Ports (3200, 8000, 44300 etc.)" },
          { text: "IPS/IDS for SAP Traffic Anomaly Detection" },
          { text: "Network Segmentation – DMZ for SAP Web Dispatcher" },
        ]},
        { text: "Physical & Facility Security", children: [
          { text: "Physical Access Control for SAP Server Areas (Biometric)" },
          { text: "Biometric & RFID Access Readers for Data Centres" },
        ]},
      ]},
      { text: "Platforms – Security Perspective", children: [
        { text: "Access Management & SSO Platform", children: [
          { text: "SAP IAS / SCP Identity Provider – SSO & MFA Platform" },
          { text: "LDAP / Active Directory Integration for SAP Authentication" },
          { text: "Certificate & PSE Management – SAP Trust Manager (STRUST)" },
        ]},
        { text: "Security Platform Components", children: [
          { text: "OS Hardening – SAP on RHEL/SLES Security Baseline (CIS/STIG)" },
          { text: "SAP BTP Security – Subaccount IAM & Service Instance Permissions" },
          { text: "No-SQL / In-Memory Store Security – HANA Tenant Isolation" },
        ]},
      ]},
      { text: "Data & Applications – Security Perspective", children: [
        { text: "Data Security", children: [
          { text: "Data Privacy – GDPR Controls in SAP DPP & Authorization" },
          { text: "Data Retention Enforcement – ILM Blocking & Deletion Policies" },
          { text: "Data Compliance – Audit-Ready Data Traceability Reports" },
        ]},
        { text: "Application Security", children: [
          { text: "SAP GRC Suite – Security, Risk & Compliance Applications" },
          { text: "SAP ETD – IT Security Monitoring & Threat Operations App" },
          { text: "Authorization Concept for Custom SAP Applications" },
        ]},
      ]},
    ],
  },
  {
    section: "Solution Manager / Cloud ALM",
    color: "#10b981",
    tree: [
      { text: "Runtime Architecture – SolMan/cALM Perspective", children: [
        { text: "Channel & Presentation Monitoring", children: [
          { text: "Real User Monitoring (RUM) – Cloud ALM End-User Experience" },
          { text: "Synthetic Monitoring – URL Health Checks for SAP Web/Mobile" },
          { text: "SAP Solution Manager Work Mode Management" },
        ]},
        { text: "Processing & Integration Monitoring", children: [
          { text: "Business Process Monitoring (BPMon) – Workflow & Job KPIs" },
          { text: "Exception Management – Cloud ALM & SolMan Alert Inbox" },
          { text: "E2E Trace & Root Cause Analysis (SolMan RCA Workbench)" },
          { text: "Integration Monitoring – SAP Integration Suite & IDoc Alerts" },
        ]},
      ]},
      { text: "Dev & Operations – SolMan/cALM Perspective", children: [
        { text: "Project & Program Management", children: [
          { text: "Cloud ALM Project Management – Scope, Milestones & Sprint Planning" },
          { text: "SAP Activate Roadmap – Agile Project Methodology in Cloud ALM" },
          { text: "Backlog & Requirement Management – Cloud ALM User Stories" },
          { text: "Progress Tracking – Cloud ALM Task & Status Dashboards" },
          { text: "Forecasting & Predictive Analytics – EWA Trend Analysis" },
        ]},
        { text: "Analysis & Design", children: [
          { text: "Requirement Capture – Cloud ALM Fit-to-Standard Workshop Docs" },
          { text: "Requirements Traceability – Cloud ALM Feature-to-Test Linkage" },
          { text: "Process Design – SolMan Business Process Repository (BPR)" },
          { text: "AS-IS Assessment – SolMan Solution Documentation & BPCA" },
        ]},
        { text: "Build & Test Management", children: [
          { text: "Test Suite – Cloud ALM / SolMan Manual & Automated Tests" },
          { text: "Test Case & Script Management – Test Plan in SolMan / cALM" },
          { text: "Test Execution Tracking – Pass/Fail Dashboards & Sign-off" },
          { text: "Test Data Management – TDMS & Data Subsetting for SAP" },
          { text: "CBTA / TAO – Automated Functional & UI Test Execution" },
          { text: "BPCA – Business Process Change Analyzer (Scope Reduction)" },
          { text: "Performance Test Integration – JMeter / Micro Focus via SolMan" },
        ]},
        { text: "Change, Release & Deployment", children: [
          { text: "ChaRM – Version & Release Management across SAP Landscape" },
          { text: "Cloud ALM CI/CD – Continuous Delivery Pipeline for S/4HANA Cloud" },
          { text: "ChaRM Retrofit – Parallel Maintenance Artefact Management" },
          { text: "ChaRM Deployment Orchestration – Automated Import Scheduling" },
          { text: "Software Distribution – Maintenance Planner & SUM Orchestration" },
        ]},
        { text: "Quality & Knowledge Management", children: [
          { text: "SAP Quality Gate Management – GoLive Checks & EWA Review" },
          { text: "Defect & Issue Tracking – SolMan ITSM / Cloud ALM Issues" },
          { text: "SAP Solution Documentation – Knowledge Base in SolMan BPR" },
          { text: "Collaboration – SAP Enable Now & Learning Management" },
        ]},
        { text: "IT Governance & Service Management", children: [
          { text: "IT Service Portfolio – SolMan Managed Objects & System Landscape" },
          { text: "IT Financial Management – SAP ITSM Cost Tracking" },
          { text: "Operations Intelligence – Cloud ALM Analytics & SolMan Reporting" },
          { text: "Supplier Management – SAP Support Backbone / SAP for Me" },
          { text: "Continuous Improvement – Focused Insights & EWA Follow-ups" },
          { text: "Service Catalogue & SLA Management – SolMan ITSM Service Desk" },
          { text: "Availability Management – Technical Monitoring SLA Dashboards" },
          { text: "Service Desk – ITSM Incident, Problem & Service Request" },
        ]},
        { text: "Data Management in Operations", children: [
          { text: "Master Data in SolMan – Logical Components, Systems, Routes" },
          { text: "Metadata Management – SolMan Solution Documentation Objects" },
          { text: "Data Quality – EWA Alerts & BPMon KPI Data Accuracy" },
          { text: "Audit Log Management – SolMan Audit Logging & Cloud ALM Trails" },
        ]},
        { text: "IT Operations Monitoring & Automation", children: [
          { text: "Technical Monitoring – Cloud ALM / SolMan System & DB Metrics" },
          { text: "Server Configuration Monitoring – LMDB & Landscape Drift Detection" },
          { text: "Semantic Monitoring – BPMon Metrics & Threshold Alerts" },
          { text: "Job Monitoring – SolMan Job Management & Cloud ALM Job Monitor" },
          { text: "Capacity & Performance Management – EWA / SolMan Workload" },
          { text: "Backup Verification – SolMan Monitoring of HANA Backup Status" },
        ]},
      ]},
      { text: "Infrastructure – SolMan/cALM Perspective", children: [
        { text: "Infrastructure Monitoring", children: [
          { text: "Host & OS Monitoring – SolMan Infrastructure Monitoring Agents" },
          { text: "Network Monitoring – Cloud ALM Connectivity Health Checks" },
          { text: "Storage Monitoring – HANA Disk & Volume Alerts via SolMan" },
        ]},
      ]},
      { text: "Platforms – SolMan/cALM Perspective", children: [
        { text: "Platform Monitoring & Alerting", children: [
          { text: "Integration Platform Monitoring – PI/PO & CPI Channel Monitoring" },
          { text: "BI / BW Platform Monitoring – Process Chain & InfoPackage Alerts" },
          { text: "ABAP Application Server Alerts – SM50/SM66 via CCMS/SolMan" },
          { text: "Cloud ALM – BTP Service & API Health Monitoring" },
        ]},
      ]},
      { text: "Data & Applications – SolMan/cALM Perspective", children: [
        { text: "Application Lifecycle Management", children: [
          { text: "Packaged SAP Apps – Upgrade & Maintenance via SolMan/cALM" },
          { text: "External & SaaS App Integration Monitoring – Cloud ALM" },
          { text: "Custom App Lifecycle – ChaRM Transport + SolMan Documentation" },
        ]},
        { text: "Data Characterisation & Reporting", children: [
          { text: "BPR Process Model – Conceptual/Logical/Physical SAP Process Docs" },
          { text: "Transaction & Reporting Data Scope in BPR Test Coverage" },
          { text: "Structured vs Unstructured Data Classification in SolMan Docs" },
          { text: "Taxonomies – SAP Business Process Taxonomy in SolMan BPR" },
        ]},
      ]},
    ],
  },
];

export function collectLeaves(node: AmsNode, prefix = ""): string[] {
  const path = prefix ? `${prefix} › ${node.text}` : node.text;
  if (!node.children || node.children.length === 0) return [path];
  return node.children.flatMap(c => collectLeaves(c, path));
}
