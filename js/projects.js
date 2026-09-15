/**
 * Project data.
 *
 * To add a new project, use admin.html, or copy the object shape below,
 * give it a unique `id`, fill in the fields, and drop your files into the
 * matching folders. See README.md for the full walkthrough.
 */
const PROJECTS = [
  {
    "id": "chess-set",
    "title": "Chess Set (In Progress)",
    "tags": [
      "Solidworks",
      "Fusion 360",
      "CAM",
      "DFM"
    ],
    "description": "**What:** Designing and manufacturing a chess set comprising a wooden board and using mild steel for the pieces.\n\n**How:** Constructed the board, then modeled and CAM-programmed the pieces starting with the pawn. Machined two pawn iterations, applying DFM lessons from the first to refine tooling and geometry on the second. CAD for the 3rd pawn iteration and remaining pieces is complete, pending CNC access for manufacturing.\n\n**Product:** A completed hardwood board and a DFM-refined pawn, validating the design ahead of fabricating the rest.",
    "images": [
      {
        "src": "images/chess-set/photo-2.jpeg",
        "caption": "Isometric View"
      },
      {
        "src": "images/chess-set/photo-1.jpeg",
        "caption": "Top View"
      },
      {
        "src": "images/chess-set/photo-3.jpeg",
        "caption": "1st (Left) & 2nd (Right) Pawn Iterations"
      }
    ],
    "showModel": false,
    "stl": ""
  },
  {
    "id": "cutting-board",
    "title": "Cutting Board",
    "tags": [
      "Fusion 360",
      "CAM",
      "CNC Routing",
      "Woodworking"
    ],
    "description": "**What:** Designing and manufacturing a cutting board from scrap walnut and maple left over from the chessboard build.\n\n**How:** Repurposed the leftover board material and CNC-routed juice grooves around the perimeter to channel liquid runoff during use.\n\n**Product:** A finished cutting board that reused shop scrap and added a functional drainage feature.",
    "images": [
      {
        "src": "images/cutting-board/photo-1.jpeg",
        "caption": "Isometric View"
      },
      {
        "src": "images/cutting-board/photo-2.jpeg",
        "caption": "Top View"
      },
      {
        "src": "images/cutting-board/photo-3.png",
        "caption": "CAM Simulation"
      }
    ],
    "showModel": false,
    "stl": ""
  },
  {
    "id": "engine-assembly",
    "title": "Engine Assembly",
    "tags": [
      "NX",
      "Parametric Modeling",
      "Assembly Modeling"
    ],
    "description": "**What:** Created a “Little Blazer” engine assembly in Siemens NX as the final project for a 3D parametric modeling course.\n\n**How:** Utilized driving dimensions, constraints, and feature-based modeling to create parts and apply assembly constraints.\n\n**Product:** Produced a multi-part assembly that can be updated while preserving relationships between components.",
    "images": [
      {
        "src": "images/engine-assembly/photo-1.png",
        "caption": ""
      },
      {
        "src": "images/engine-assembly/photo-2.png",
        "caption": ""
      },
      {
        "src": "images/engine-assembly/photo-3.png",
        "caption": ""
      }
    ],
    "showModel": true,
    "stl": "models/stl/engine-assembly.stl"
  },
  {
    "id": "butterfly-valve",
    "title": "Butterfly Valve",
    "tags": [
      "NX",
      "Parametric Modeling",
      "Assembly Modeling"
    ],
    "description": "**What:** Modeled a butterfly valve elbow and pipe assembly in Siemens NX using technical drawings.\n\n**How:** Utilized parametric modeling in Siemens NX with driving dimensions and feature relationships to maintain design intent.\n\n**Product:** Created a fully constrained assembly that demonstrated proper alignment and functional motion, with the lever arm rotating the valve plate while the surrounding geometry remained fixed and consistent.",
    "images": [
      {
        "src": "images/butterfly-valve/photo-4.png",
        "caption": ""
      },
      {
        "src": "images/butterfly-valve/photo-5.png",
        "caption": ""
      },
      {
        "src": "images/butterfly-valve/photo-10.png",
        "caption": ""
      }
    ],
    "showModel": true,
    "stl": "models/stl/butterfly-valve.stl"
  },
  {
    "id": "sample-project",
    "title": "RC Car Workshop",
    "tags": [
      "Fusion 360",
      "Technical Writing",
      "Project Scheduling",
      "Microsoft Office Suite"
    ],
    "description": "**What:** Led a team of engineering students in developing an RC car outreach workshop designed to engage prospective Purdue Indianapolis students through hands-on mechanical engineering activities. \n\n**How:** Oversaw task scheduling, sub-team progress, and weekly accomplishments across the class, along with assisting in the integration of circuitry and Arduino-based control into the RC car.\n\n**Product:** Completed 27 laps in competition, achieved 3rd place in braking distance, and successfully met all competition requirements.",
    "images": [
      {
        "src": "images/sample-project/photo-3.png",
        "caption": "Vehicle Frame"
      },
      {
        "src": "images/sample-project/photo-4.png",
        "caption": "Circuit Schematic"
      },
      {
        "src": "images/sample-project/photo-2.png",
        "caption": "Racetrack"
      }
    ],
    "showModel": false,
    "stl": "models/stl/sample-project.stl"
  },
  {
    "id": "supermileage-vehicle",
    "title": "Supermileage Vehicle",
    "tags": [
      "Welding",
      "Prototyping",
      "Hand & Power Tools"
    ],
    "description": "**What:** Designed and built a fuel-efficient vehicle to meet competition requirements for maneuverability, braking, aerodynamics, and measurement compliance. \n\n**How:** Prototyped the design with PVC pipes, recreated the final structure using steel bars, applied welding techniques to the framework, and added aerodynamic features to reduce airflow impact. \n\n**Product:** Completed 27 laps in competition, achieved 3rd place in braking distance, and successfully met all competition requirements.",
    "images": [
      {
        "src": "images/supermileage-vehicle/photo-4.png",
        "caption": "Welded Frame"
      },
      {
        "src": "images/supermileage-vehicle/photo-2.png",
        "caption": "Practice Weld"
      },
      {
        "src": "images/supermileage-vehicle/photo-3.png",
        "caption": "Final Product"
      }
    ],
    "showModel": false,
    "stl": ""
  }
];
