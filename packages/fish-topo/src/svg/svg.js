import './graphic';
import {registerPainter} from '../fish-topo';
import SVGPainter from './SVGPainter';

registerPainter('svg', SVGPainter);