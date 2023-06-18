import Blockies from 'react-blockies';
// Function that returns an Identicon template using the address given
export const identiconTemplate = (address : string) => {
    return <Blockies size={10} // number of pixels square
    scale={4} // width/height of each 'pixel'
    className="identicon border-2 border-white rounded-full" // optional className
    seed={address} // seed used to generate icon data, default: random
    />
}