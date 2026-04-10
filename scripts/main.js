let cols = [Pal.lancerLaser, Pal.accent, Color.valueOf("cc6eaf")]; //Pink from BetaMindy
let folded = false;
let curSpeed = 0;
let longPress = 30;
let unfoldTimer = 0;
let maxSpeed = 4; // Max game speed: maxSpeed ** 2

let timeSlider = null;
let foldedButton = null;
let l = null; 

function sliderTable(table){
    table.table(Tex.buttonEdge3, t => {
        t.name = "tc-slidertable";
        timeSlider = new Slider(-maxSpeed, maxSpeed, 1, false);
        timeSlider.setValue(0);
        
        l = t.button("[accent]x1", () => {
            curSpeed = Mathf.clamp(curSpeed, -2, 2) - 1;
            foldedButton.fireClick();
            folded = true;
        }).grow().width(10.5 * 8).get();
        l.margin(0);
        let lStyle = l.getStyle();
        lStyle.up = Tex.pane;
        lStyle.over = Tex.flatDownBase;
        lStyle.down = Tex.whitePane;
        
        let b = t.button(new TextureRegionDrawable(Icon.refresh), 24, () => timeSlider.setValue(0)).padLeft(6).get();
        b.getStyle().imageUpColor = Pal.accent;
        t.add(timeSlider).padLeft(6).minWidth(200);
        timeSlider.moved(v => setSpeed(v));
    });
    table.visibility = () => !folded && visibility();
}

function foldedButtonTable(table){
    table.table(Tex.buttonEdge3, t => {
        t.name = "tc-foldedtable";
        foldedButton = t.button("[accent]x1", () => {
            curSpeed++;
            if(curSpeed > 2) curSpeed = -2;
            
            let speed = Math.pow(2, curSpeed);
            Time.setDeltaProvider(() => Math.min(Core.graphics.getDeltaTime() * 60 * speed, 3 * speed));
            
            foldedButton.setText(speedText(curSpeed));
            timeSlider.setValue(curSpeed);
        }).grow().width(10.5 * 8).get();
        foldedButton.margin(0);
        
        foldedButton.update(() => {
            if(foldedButton.isPressed()){
                unfoldTimer += Core.graphics.getDeltaTime() * 60;
                if(unfoldTimer > longPress && folded){
                    folded = false;
                    unfoldTimer = 0;
                }
            }else{
                unfoldTimer = 0;
            }
        });
    }).height(72);
    table.visibility = () => folded && visibility();
}

function speedText(speed){
    Tmp.c1.lerp(cols, (speed + 8) / 16);
    let text = "[#" + Tmp.c1.toString() + "]";
    if(speed >= 0){
        text += "x" + Math.pow(2, speed);
    }else{
        text += "x1/" + Math.pow(2, Math.abs(speed));
    }
    return text;
}

function visibility(){
    if (Vars.net.client()) {
        return false;
    }
    if(!Vars.ui.hudfrag.shown || Vars.ui.minimapfrag.shown()) return false;
    if(!Vars.mobile) return true;
    
    let input = Vars.control.input;
    return input.lastSchematic == null || input.selectPlans.isEmpty();
}    

if(!Vars.headless){
    Events.on(ClientLoadEvent, () => {
        let ft = new Table();
        ft.bottom().left();
        foldedButtonTable(ft);
        Vars.ui.hudGroup.addChild(ft);
        
        let st = new Table();
        st.bottom().left();
        sliderTable(st);
        Vars.ui.hudGroup.addChild(st);
        
        if(Vars.mobile){
            st.moveBy(0, Scl.scl(46));
            ft.moveBy(0, Scl.scl(46));
        }
    });
}

// Set the speed of the game to the highest safe value (see canChangeSpeed)
function setSpeed(v){
    if(canChangeSpeed(v)) forceSetSpeed(v);
    else if(v > 0) forceSetSpeed(0);  
}

// Forcibly change the speed of the game
function forceSetSpeed(v){
    curSpeed = v;
    let speed = Math.pow(2, v);
    Time.setDeltaProvider(() => Math.min(Core.graphics.getDeltaTime() * 60 * speed, 3 * speed));
    Tmp.c1.lerp(cols, (timeSlider.getValue() + 8) / 16);
    l.setText(speedText(v)); 
    timeSlider.setValue(v);
}

// Return whether the game is safe to run at this speed. 
function canChangeSpeed(v){
    return v == 0 || Core.graphics.getFramesPerSecond() / Math.pow(2, v) >= 5; 
}

// Reduce the game speed to a safe level. Will not go below default game speed. Will not trigger in the menus.  
Events.run(Trigger.update, () => { 
    if(curSpeed > 0 && Vars.state.getState() == GameState.State.playing && !canChangeSpeed(curSpeed)) { 
        forceSetSpeed(curSpeed - 1); 
    }
});

// Erase all out of bounds units every 2 seconds.
Timer.schedule(() => {
    Groups.unit.each(u => {
        if(u.x !== u.x){
            u.remove();
        }
    });
}, 0, 2);
