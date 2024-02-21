import CupImage from '../assets/images/cup.png'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
export default function LogPanel(props : any){
    return <div >
        <span className="log-panel-item"><img style={{width:"20px"}} src={CupImage} alt={"cup"}/></span> <span className="text-danger">{props.log.loserName}</span> JUST FINESSED <span className="text-primary">{props.log.winnerName}</span> OUT OF {props.log.amount/LAMPORTS_PER_SOL} SOL! BETTER LUCK NEXT TIME
    </div>
}