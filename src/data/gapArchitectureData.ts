export interface GapNode {
  text: string;
  children?: GapNode[];
}
export interface GapSection {
  section: string;
  color: string;
  gapCount: number;
  tree: GapNode[];
}

export const GAP_ARCHITECTURE: GapSection[] = [
  {
    section: "Runtime Architecture",
    color: "#f85149",
    gapCount: 6,
    tree: [
      { text: "Runtime Architecture Fundamentals", children: [
        { text: "Channel support capabilities", children: [
          { text: "Owned Digital channels" },
          { text: "Owned installed applications" },
          { text: "Third party Digital channels" },
          { text: "Owned traditional channels" },
        ]},
        { text: "Technical Runtime capabilities", children: [
          { text: "Presentation capabilities" },
          { text: "Data Management and Integration capabilities" },
        ]},
      ]},
    ],
  },
  {
    section: "Dev & Operations",
    color: "#fb923c",
    gapCount: 44,
    tree: [
      { text: "Program and Project management capabilities", children: [
        { text: "Planning and project management capabilities", children: [
          { text: "Estimating" },
        ]},
        { text: "Resourcing and collaborative management capabilities", children: [
          { text: "Staffing and resource planning" },
          { text: "Training and competency management" },
        ]},
        { text: "Agile project management capabilities", children: [
          { text: "Backlog management and prioritisation" },
          { text: "Burn down/up tracking" },
          { text: "Retrospective management" },
          { text: "TDD and BDD enablement" },
        ]},
      ]},
      { text: "Analysis and Design capabilities", children: [
        { text: "Analysis enablement capabilities", children: [
          { text: "Use case/Story definition enablement" },
          { text: "Prototyping, mockups and storyboarding" },
        ]},
        { text: "Design enablement capabilities", children: [
          { text: "Media creation enablement" },
          { text: "Environments specification enablement" },
        ]},
      ]},
      { text: "Build and Test Capabilities", children: [
        { text: "Software generation capabilities", children: [
          { text: "Software defined infra definition enablement" },
          { text: "Code generation and forward engineering" },
        ]},
        { text: "Build and integration enablement capabilities", children: [
          { text: "Software compilation and validation" },
          { text: "Software linking and packaging" },
          { text: "Development environment integration" },
        ]},
        { text: "Test management capabilities", children: [
          { text: "Test case and script creation" },
          { text: "Test data creation and management" },
        ]},
        { text: "Test execution and automation capabilities", children: [
          { text: "UI test enablement" },
          { text: "Unit test enablement" },
          { text: "Service and API test enablement" },
          { text: "Security test enablement" },
        ]},
      ]},
      { text: "Software configuration and release management capabilities", children: [
        { text: "Version, release and artifact management", children: [
          { text: "Software configuration management" },
        ]},
      ]},
      { text: "Quality and knowledge management capabilities", children: [
        { text: "Quality management capabilities", children: [
          { text: "Quality assurance and reviews" },
        ]},
      ]},
      { text: "Environments", children: [
        { text: "Build environments", children: [
          { text: "Development environments" },
          { text: "Unit test environments" },
        ]},
        { text: "Test environments", children: [
          { text: "Prototype and POC environments" },
          { text: "System test environments" },
          { text: "User acceptance test environments" },
          { text: "Performance and scalability test environments" },
        ]},
        { text: "Production environments", children: [
          { text: "Live environments" },
          { text: "Disaster recovery environments" },
        ]},
        { text: "Maintenance environments", children: [
          { text: "Fix development environments" },
          { text: "Fix Test environments" },
        ]},
      ]},
      { text: "IT organization, Asset and Service management capabilities", children: [
        { text: "IT governance capabilities", children: [
          { text: "IT resource management" },
          { text: "IT risk management" },
        ]},
        { text: "Service management capabilities", children: [
          { text: "Service usage metering and billing" },
        ]},
        { text: "Service operation capabilities", children: [
          { text: "Service desk" },
        ]},
      ]},
      { text: "Data management capabilities", children: [
        { text: "Master, Reference and Metadata management", children: [
          { text: "Reference data management" },
        ]},
        { text: "Data lifecycle management capabilities", children: [
          { text: "Data conversion and migration" },
        ]},
      ]},
      { text: "IT operations management capabilities", children: [
        { text: "System workstation and IAAS management capabilities", children: [
          { text: "Server configuration and management" },
          { text: "Environment configuration and management" },
          { text: "Workstation configuration and management" },
          { text: "IAAS configuration and management" },
        ]},
      ]},
    ],
  },
  {
    section: "Infrastructure",
    color: "#facc15",
    gapCount: 43,
    tree: [
      { text: "Computing components", children: [
        { text: "End user computers", children: [
          { text: "Personal computers" },
          { text: "Laptops" },
          { text: "Workstations" },
          { text: "Tablets" },
          { text: "Kiosks" },
        ]},
        { text: "Back end computers", children: [
          { text: "Mainframes" },
          { text: "Blade servers" },
          { text: "Massively parallel computers" },
          { text: "Platform appliances" },
        ]},
        { text: "Autonomous computing devices", children: [
          { text: "Mobile phones" },
          { text: "Embedded computers" },
          { text: "Robots" },
        ]},
      ]},
      { text: "Network components", children: [
        { text: "Network hardware", children: [
          { text: "Hubs and switches" },
          { text: "Routers, bridges and gateways" },
          { text: "Network interfaces" },
          { text: "Load balancers" },
        ]},
        { text: "Physical network connectivity", children: [
          { text: "Cabling" },
          { text: "Modems" },
          { text: "Antennas" },
          { text: "CTI hardware" },
        ]},
        { text: "Storage components", children: [
          { text: "Directly attached drives" },
          { text: "NAS" },
          { text: "SAN" },
          { text: "Removable hard disks" },
          { text: "Tape drives" },
          { text: "Optical drives" },
        ]},
        { text: "Storage supports", children: [
          { text: "Removable disks" },
          { text: "Tapes" },
          { text: "Optical media" },
        ]},
      ]},
      { text: "Computing accessories", children: [
        { text: "Peripherals", children: [
          { text: "Printers" },
          { text: "Displays" },
          { text: "Mice and Keyboards" },
          { text: "Scanners" },
          { text: "Microphones" },
        ]},
        { text: "Sensors and actuators", children: [
          { text: "Environmental sensors" },
          { text: "Location detectors" },
          { text: "Actuators" },
          { text: "RFID detectors and tags" },
        ]},
      ]},
      { text: "Data center infra components", children: [
        { text: "Data facility components", children: [
          { text: "Data center space" },
          { text: "Modular data centers" },
        ]},
        { text: "Data center equipment", children: [
          { text: "HVAC" },
          { text: "Power supply and UPS" },
          { text: "Racks" },
        ]},
      ]},
    ],
  },
  {
    section: "Platforms",
    color: "#a3e635",
    gapCount: 36,
    tree: [
      { text: "Presentation components", children: [
        { text: "Web intermediation software", children: [
          { text: "Transcoding server software" },
        ]},
        { text: "Presentation software", children: [
          { text: "Web browsers" },
          { text: "Web Server software" },
        ]},
        { text: "Presentation frameworks and libraries", children: [
          { text: "Mashup frameworks" },
          { text: "Augmented and virtual reality support software" },
          { text: "Speech recognition and generation software" },
        ]},
      ]},
      { text: "Logic execution components", children: [
        { text: "Automation software", children: [
          { text: "Business rule engines" },
          { text: "Cognitive computing software" },
        ]},
        { text: "Code execution server software", children: [
          { text: "Application server software" },
          { text: "Language virtual machines and code containers" },
          { text: "Language interpreters & JIT compilers" },
        ]},
        { text: "Runtime frameworks and libraries", children: [
          { text: "Persistency frameworks" },
          { text: "Utility libraries" },
        ]},
      ]},
      { text: "Integration components", children: [
        { text: "Integration software", children: [
          { text: "EAI server software" },
          { text: "Message brokers" },
          { text: "ESBs" },
          { text: "API management software" },
          { text: "ETL software" },
          { text: "EDA and CEP server software" },
        ]},
        { text: "Integration frameworks and libraries", children: [
          { text: "Integration libraries" },
        ]},
      ]},
      { text: "Data and reporting components", children: [
        { text: "Reporting software", children: [
          { text: "Data visualization software" },
        ]},
        { text: "Data management software", children: [
          { text: "MDM server software" },
          { text: "Search and ECM server software" },
          { text: "Media streaming server software" },
          { text: "Search and indexing software" },
        ]},
        { text: "Data stores", children: [
          { text: "Relational RDBMS" },
          { text: "No-SQL server software" },
          { text: "Data warehousing server software" },
          { text: "File server software" },
          { text: "GIS server software" },
        ]},
      ]},
      { text: "Operating system and cloud software", children: [
        { text: "Operating systems", children: [
          { text: "Server OS" },
          { text: "Desktop OS" },
          { text: "Tablet and phone OS" },
          { text: "Embedded and autonomous device OS" },
        ]},
        { text: "Cloud enablement software", children: [
          { text: "PAAS enablement software" },
          { text: "IAAS enablement software" },
        ]},
      ]},
    ],
  },
  {
    section: "Data & Applications",
    color: "#38bdf8",
    gapCount: 15,
    tree: [
      { text: "Data Management", children: [
        { text: "Data governance", children: [
          { text: "Data ownership" },
          { text: "Data stewardship" },
        ]},
        { text: "Master, Reference and Metadata management", children: [
          { text: "Reference data management" },
        ]},
      ]},
      { text: "Data characterisation", children: [
        { text: "Data scopes", children: [
          { text: "Key reference data" },
        ]},
        { text: "Data states", children: [
          { text: "Persisted data" },
          { text: "Cached data" },
        ]},
        { text: "Taxonomies", children: [
          { text: "Subject matter taxonomies" },
          { text: "Navigation taxonomies" },
          { text: "Ontologies" },
        ]},
      ]},
      { text: "Solution specific applications", children: [
        { text: "Application landscape components", children: [
          { text: "Packaged vendor applications" },
          { text: "External integrated applications" },
          { text: "SaaS vendor applications" },
        ]},
      ]},
      { text: "Non Solution specific applications", children: [
        { text: "Application landscape components", children: [
          { text: "PPM and development applications" },
          { text: "IT service management and operations applications" },
          { text: "Other non solution specific ITG applications" },
        ]},
      ]},
    ],
  },
];

export function flattenGapItems(section: GapSection): string[] {
  function walk(node: GapNode, prefix: string): string[] {
    const label = prefix ? `${prefix} › ${node.text}` : node.text;
    if (!node.children?.length) return [node.text];
    return node.children.flatMap(c => walk(c, label));
  }
  return section.tree.flatMap(n => walk(n, ""));
}

export function allGapLeaves(): { section: string; color: string; item: string }[] {
  return GAP_ARCHITECTURE.flatMap(sec =>
    flattenGapItems(sec).map(item => ({ section: sec.section, color: sec.color, item }))
  );
}
