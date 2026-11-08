import { nanoid } from 'nanoid';

const id = () => nanoid(8);

const box = (x, y, w, h, label, fill = '#dbeafe', stroke = '#3b82f6') => ({
  id: id(), type: 'rounded', x, y, w, h, label, fill, stroke, strokeWidth: 2, fontSize: 14,
});

const rect = (x, y, w, h, label, fill = '#f1f5f9', stroke = '#64748b') => ({
  id: id(), type: 'rectangle', x, y, w, h, label, fill, stroke, strokeWidth: 2, fontSize: 14,
});

const db = (x, y, w, h, label) => ({
  id: id(), type: 'cylinder', x, y, w, h, label, fill: '#dcfce7', stroke: '#10b981', strokeWidth: 2, fontSize: 13,
});

const arrowEl = (x, y, w, label = '') => ({
  id: id(), type: 'arrow', x, y, w, h: 0, label, stroke: '#64748b', strokeWidth: 2, fill: 'transparent', fontSize: 12,
});

const textEl = (x, y, label, size = 16) => ({
  id: id(), type: 'text', x, y, w: 300, h: size + 4, label, fill: '#1e293b', stroke: 'transparent', strokeWidth: 0, fontSize: size,
});

export const TEMPLATES = [
  {
    title: 'URL Shortener (HLD)',
    description: 'High-level design of a URL shortening service like bit.ly',
    category: 'HLD',
    elements: [
      textEl(380, 20, 'URL Shortener — High Level Design', 22),
      box(120, 80, 140, 50, 'Client / Browser', '#fef3c7', '#f59e0b'),
      box(340, 80, 140, 50, 'API Gateway', '#ede9fe', '#8b5cf6'),
      box(560, 80, 140, 50, 'App Server', '#dbeafe', '#3b82f6'),
      rect(120, 180, 140, 40, 'Load Balancer'),
      db(560, 180, 140, 80, 'PostgreSQL'),
      rect(380, 320, 140, 40, 'Cache (Redis)'),
      box(560, 320, 140, 40, 'Base62 Encoder', '#e0f2fe', '#0ea5e9'),
      arrowEl(260, 105, 80),
      arrowEl(480, 105, 80),
      arrowEl(630, 130, 0),
      arrowEl(630, 180, 0),
      arrowEl(450, 200, 110),
      textEl(250, 250, '1. Long URL to Short URL', 13),
      textEl(250, 275, '2. Short URL to Long URL (redirect)', 13),
    ],
  },
  {
    title: 'Parking Lot (LLD)',
    description: 'Low-level design of a parking lot system with classes',
    category: 'LLD',
    elements: [
      textEl(320, 20, 'Parking Lot — Low Level Design', 22),
      rect(300, 70, 200, 60, 'ParkingLot', '#dbeafe', '#3b82f6'),
      textEl(320, 88, '+ floors: List<Floor>', 11),
      textEl(320, 104, '+ addFloor()', 11),
      rect(80, 190, 180, 70, 'ParkingFloor', '#dcfce7', '#10b981'),
      textEl(100, 210, '+ spots: List<Spot>', 11),
      textEl(100, 226, '+ findSpot(type)', 11),
      rect(330, 190, 180, 70, 'ParkingSpot', '#fef3c7', '#f59e0b'),
      textEl(350, 210, '+ number: String', 11),
      textEl(350, 226, '+ isFree: boolean', 11),
      rect(580, 190, 180, 70, 'Vehicle', '#fee2e2', '#ef4444'),
      textEl(600, 210, '+ plate: String', 11),
      textEl(600, 226, '+ type: VehicleType', 11),
      rect(80, 320, 180, 60, 'Ticket', '#ede9fe', '#8b5cf6'),
      textEl(100, 340, '+ entryTime', 11),
      textEl(100, 356, '+ spot: ParkingSpot', 11),
      rect(330, 320, 180, 60, 'Payment', '#e0f2fe', '#0ea5e9'),
      textEl(350, 340, '+ amount: double', 11),
      textEl(350, 356, '+ pay()', 11),
      arrowEl(380, 130, 0),
      arrowEl(300, 190, 0),
      arrowEl(510, 190, 0),
    ],
  },
  {
    title: 'Chat System (HLD)',
    description: 'WhatsApp-style messaging system high-level design',
    category: 'HLD',
    elements: [
      textEl(360, 20, 'Chat System — High Level Design', 22),
      box(60, 80, 130, 50, 'Mobile Client', '#fef3c7', '#f59e0b'),
      box(250, 80, 130, 50, 'WebSocket Gateway', '#ede9fe', '#8b5cf6'),
      box(440, 80, 130, 50, 'Message Service', '#dbeafe', '#3b82f6'),
      db(640, 80, 130, 70, 'Message DB'),
      rect(440, 190, 130, 40, 'Presence Service'),
      rect(250, 190, 130, 40, 'Push Notification'),
      box(60, 190, 130, 40, 'Redis Cache', '#dcfce7', '#10b981'),
      arrowEl(190, 105, 60),
      arrowEl(380, 105, 60),
      arrowEl(570, 105, 70),
      arrowEl(505, 130, 0),
      arrowEl(315, 130, 0),
      arrowEl(190, 190, 60),
    ],
  },
  {
    title: 'Elevator System (LLD)',
    description: 'Low-level design of an elevator control system',
    category: 'LLD',
    elements: [
      textEl(340, 20, 'Elevator System — LLD', 22),
      rect(320, 70, 200, 70, 'ElevatorController', '#dbeafe', '#3b82f6'),
      textEl(340, 92, '+ elevators: List', 11),
      textEl(340, 108, '+ handleRequest()', 11),
      rect(60, 190, 180, 70, 'Elevator', '#dcfce7', '#10b981'),
      textEl(80, 210, '+ currentFloor', 11),
      textEl(80, 226, '+ state: State', 11),
      textEl(80, 242, '+ move()/stop()', 11),
      rect(320, 190, 180, 70, 'Request', '#fef3c7', '#f59e0b'),
      textEl(340, 210, '+ floor: int', 11),
      textEl(340, 226, '+ direction: Dir', 11),
      rect(580, 190, 180, 70, 'DispatchStrategy', '#fee2e2', '#ef4444'),
      textEl(600, 210, '+ assign(req)', 11),
      textEl(600, 226, '+ nearestElevator()', 11),
      rect(320, 320, 180, 60, 'Door', '#ede9fe', '#8b5cf6'),
      textEl(340, 340, '+ open() / close()', 11),
      rect(60, 320, 180, 60, 'FloorButton', '#e0f2fe', '#0ea5e9'),
      textEl(80, 340, '+ press() / light()', 11),
      arrowEl(420, 140, 0),
      arrowEl(250, 190, 0),
      arrowEl(500, 190, 80),
      arrowEl(420, 260, 0),
      arrowEl(250, 320, 0),
    ],
  },
  {
    title: 'Cache System (HLD)',
    description: 'Distributed cache with LRU eviction',
    category: 'HLD',
    elements: [
      textEl(360, 20, 'Distributed Cache — HLD', 22),
      box(100, 80, 140, 50, 'Client', '#fef3c7', '#f59e0b'),
      box(320, 80, 140, 50, 'Cache Router', '#ede9fe', '#8b5cf6'),
      box(540, 80, 140, 50, 'Cache Shard 1', '#dbeafe', '#3b82f6'),
      box(540, 160, 140, 50, 'Cache Shard 2', '#dbeafe', '#3b82f6'),
      box(540, 240, 140, 50, 'Cache Shard N', '#dbeafe', '#3b82f6'),
      rect(320, 160, 140, 40, 'Consistent Hashing'),
      rect(100, 320, 140, 40, 'LRU Eviction'),
      db(320, 320, 140, 70, 'Replica DB'),
      arrowEl(240, 105, 80),
      arrowEl(460, 105, 80),
      arrowEl(460, 130, 80),
      arrowEl(390, 120, 0),
      arrowEl(390, 160, 0),
      textEl(220, 280, 'Sharding by key hash', 13),
      textEl(70, 310, 'Evict LRU when full', 13),
    ],
  },
  {
    title: 'Blank Canvas',
    description: 'Start from scratch with an empty canvas',
    category: 'Blank',
    elements: [],
  },
];

export const TEMPLATE_CATEGORIES = ['All', 'HLD', 'LLD', 'Blank'];
