const inputForm = document.querySelector(".input-form")
const liftContainer = document.querySelector(".lift-container")
const state = {
    lifts: [],
    floors: {}
}
const queue = []
const sock = io();
const usersCount = document.querySelector(".users-count")

sock.emit('newClient',"new client joined....")
sock.on('newClient',()=>{
    document.querySelector(".alert-msg-container").classList.add("active")
    console.log("hey")
    setTimeout(() =>{
        document.querySelector(".alert-msg-container").classList.remove("active")
    },2500)
})
sock.on('clientCountUpdate',(data) => {
    usersCount.innerHTML = data
})
sock.on('liftGenerator',(data) => {
    liftSimulationGenerator(data)
})
sock.on('liftCall',(data) =>{
    liftCallHandler(data[0],data[1])
})

function liftSimulationGenerator(data){
    
    document.querySelectorAll(".floor-container").forEach(element => {
        element.remove() // removing all existing floor elements on form submit
    })
    document.querySelectorAll(".lift").forEach(element => {
        element.remove() // removing all existing lift elements on form submit
    })
    const numberOfFloors = Number(data[0])
    const numberOfLifts = Number(data[1]) 
    addLiftsAndFloors(numberOfFloors, numberOfLifts)
}
   

function addLiftsAndFloors(nof,nol){
    // creating floors
    for(let i = 0;i <= nof;i++){
        const floorContainer = document.createElement("div")

        floorContainer.className = "floor-container"
        floorContainer.setAttribute("data-floor",i)

        floorContainer.innerHTML = `
        <div class="button-container">
           ${i !== nof ? `<button class="up" data-floor=${i} data-direction="up">⬆</button>` : ``} 
           ${i !== 0 ? `<button class="down" data-floor=${i} data-direction="down">⬇</button>` : ``}
        </div>
        <p class="floor-number">FLOOR - ${i}</p>
        `
        
        document.querySelector(".lift-container").prepend(floorContainer)
    } 
   // creating lifts
    for(let i = 1; i <= nol; i++){
        const lift = document.createElement("div")
        
        lift.className = "lift"
        lift.setAttribute("data-lift",i)
        // styling of lift
        lift.style.left = (15+(i*60))+"px"
        lift.innerHTML = `
                        <div class="lift-door left-door"></div>
                        <div class="lift-door right-door"></div>
                        `

        document.querySelector(".lift-container").append(lift)
      
    }
    // initialising lift positions
    document.querySelectorAll(".lift").forEach((element,index) => {
        state.lifts[index] = {id:element.dataset.lift, pos: 0, busy: false, liftHeight: 0}
    })
    // lift up button listener
    document.querySelectorAll(".button-container .up").forEach(element => {
        element.addEventListener("click",(event) => {
            const { target } = event
            sock.emit('liftCall',[target.dataset, target.dataset.floor])
            liftCallHandler(target.dataset,target.dataset.floor)
        })
    })
    // lift down button listener
    document.querySelectorAll(".button-container .down").forEach(element => {
        element.addEventListener("click",(event) => {
            const { target } = event
            sock.emit('liftCall',[target.dataset, target.dataset.floor])
            liftCallHandler(target.dataset,target.dataset.floor)
        })
    })
}
//Event listener for generate
inputForm.addEventListener("submit",(event) => {
        event.preventDefault()
        if(Number(event.target[0].value) <= 0 || Number(event.target[0].value) <= 0){
            event.target[0].value = ''; event.target[1].value = ''
            alert("Please enter valid number of lifts/floors")
           }
        else{
            sock.emit('liftGenerator',[ event.target[0].value, event.target[1].value])
        }
})

function liftCallHandler(target,floor){
    const destFloor = Number(floor)
    const direction = target.direction
    const liftBtn = document.querySelector(`[data-floor="${destFloor}"][data-direction="${direction}"]`) //getting the list button clicked
    try{
        if(state.floors["F"+destFloor+direction].assigned){
            return
        }
    }
    catch{
        liftBtn.classList.add("active")
        // pass
    }
    // MOVE LIFT FUNCTION
    function moveLift(lift){
        const liftEl = document.querySelector(`[data-lift="${lift}"]`) // storing available lift element
        const currentLiftHeight = state.lifts[lift-1].liftHeight 
        const multiplier = destFloor - state.lifts[lift-1].pos
        if(multiplier >= 0){
            var translateValue = (100*Math.abs(multiplier)) + currentLiftHeight
        }
        else{
            var translateValue = currentLiftHeight - (100*Math.abs(multiplier))
        }
        liftEl.style.transform= `translateY(-${translateValue}px)`
        liftEl.style.transition = `transform ${Math.abs(multiplier)*2}s linear`
        // updating state of lift height from ground
        state.lifts[lift-1].liftHeight = translateValue
         
        setTimeout(
            () => {
                liftEl.querySelectorAll(".lift *").forEach(
                    el => {
                        el.classList.add("active")
                    }
                )
                setTimeout(
                    () => {
                        liftBtn.classList.remove("active")
                        delete state.floors["F"+destFloor+direction];
                        state.lifts[lift-1].pos = destFloor;
                        state.lifts[lift-1].busy = false;
                        liftEl.querySelectorAll(".lift *").forEach(el =>{
                            el.classList.remove("active")
                        }) 
                        if(queue.length > 0){
                            liftCallHandler(queue[queue.length - 1].target,queue[queue.length - 1].id)
                            queue.pop()
                        }
                    }
               ,5000 )
            }
        ,2000 * Math.abs(multiplier))
    }
    
    function findNearestAvailableLift(){
        let nearestAvailableLift = null
        let counter = 0
            for(let i = 0;i<state.lifts.length;i++){
                if(!state.lifts[i].busy){
                    if(counter === 0){
                        nearestAvailableLift = state.lifts[i].id
                        counter++;
                    }
                    else{
                        const currentAvailabeLiftDistance = Math.abs(state.lifts[nearestAvailableLift-1].pos - destFloor)
                        const newAvailableLiftDistance = Math.abs(state.lifts[i].pos - destFloor)
                        if(newAvailableLiftDistance < currentAvailabeLiftDistance){
                            nearestAvailableLift = state.lifts[i].id
                        }
                    }
                }
            }
             
            if(nearestAvailableLift !== null){
                
                state.lifts[nearestAvailableLift - 1].busy = true
                state.floors["F"+destFloor+direction] = { assigned: nearestAvailableLift }
                
               moveLift(nearestAvailableLift)
            }
            else{
                let existingCallInQueue = 0
                for(const x in queue){
                    if(Number(queue[x].id) === destFloor && queue[x].direction === direction ){
                        existingCallInQueue++
                    }
                }
                if (existingCallInQueue === 0) {
                 queue.unshift({id: destFloor,target,assigned: null,direction})
                }
            }
       
}
  findNearestAvailableLift() 
}


