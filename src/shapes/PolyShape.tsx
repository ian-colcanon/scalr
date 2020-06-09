import * as React from 'react';
import { ShapeProps, ShapeType } from './Shape';
import { useSelector, useDispatch } from 'react-redux';
import { PolyPathDefinition, generatePoly } from './PathUtilities';
import { getColorFromArray } from './StyleUtilities';
import { scuteStore } from 'src/redux/ScuteStore';

import './style/shapes.scss';
import './style/Handle.scss';

export const PolyShape = React.memo(({defs, children}:ShapeProps) => {
    const[handleable, setHandleable] = React.useState(false);
    const dispatch = useDispatch();
    const polyDefn:PolyPathDefinition = useSelector((store:scuteStore) => generatePoly(store.root.lines, dispatch, defs.segments));
    let bbox = polyDefn.bbox;
    
    const styles = {
        fill: defs.styles['fill'] ? getColorFromArray(defs.styles['fill']) : null,
        stroke: defs.styles['stroke'] ? getColorFromArray(defs.styles['stroke']) : null,
        strokeWidth: defs.styles['strokeWidth'],
    }

    return (
        <g className="hoverGroup" onMouseDown={()=>setHandleable(!handleable)}>

            {defs.tag == ShapeType.SP_POLYG ?
                <polygon className={(handleable ? 'handleable' : '')}
                    points={polyDefn.defn} 
                    style={styles}
                ></polygon>
                :
                <polyline className={(handleable ? 'handleable' : '')}
                    points={polyDefn.defn} 
                    style={styles}
                ></polyline>
            }

            {handleable ?
                polyDefn.handles
            : null} 
        </g>
    );
 });