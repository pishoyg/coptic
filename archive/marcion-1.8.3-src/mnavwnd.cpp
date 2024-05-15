#include "mnavwnd.h"
#include "ui_mnavwnd.h"

MNavWnd::MNavWnd(QPixmap const * pixmap,double x_percent,double y_percent,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MNavWnd),
    _pixmap()
{
    ui->setupUi(this);

    setWindowFlags(Qt::Tool|Qt::WindowStaysOnTopHint);

    QRect const g=QApplication::desktop()->geometry();
    if(g.width()>g.height())
    {
        int height=g.height()/4;
        if(height<100)
            height=100;
        _pixmap=pixmap->scaledToHeight(height);
    }
    else
    {
        int width=g.width()/4;
        if(width<100)
            width=100;
        _pixmap=pixmap->scaledToWidth(width);
    }

    QPoint const cur_pos(((double)_pixmap.width()/100)*x_percent,((double)_pixmap.height()/100)*y_percent);
    updatePixmap(cur_pos);
    adjustSize();
    setMaximumSize(size());
    setMinimumSize(size());
}

MNavWnd::~MNavWnd()
{
    delete ui;
}

//

void MNavWnd::keyPressEvent(QKeyEvent * event)
{
    if(event->key()==Qt::Key_Escape)
    {
        close();
        event->accept();
    }
}

void MNavWnd::mousePressEvent(QMouseEvent * event)
{
    if(event->button()&&Qt::LeftButton|Qt::RightButton|Qt::MidButton)
    {
        if(ui->lblImg->underMouse())
        {
            QPoint const p(ui->lblImg->mapFrom(this,event->pos()));
            updatePixmap(p);
            emit navigate((double)p.x()/((double)_pixmap.width()/100),(double)p.y()/((double)_pixmap.height()/100));
            event->accept();
        }
    }
}

void MNavWnd::updatePixmap(QPoint p)
{
    QPixmap px(_pixmap);
    QPainter painter(&px);
    QPen penb((QColor(Qt::black))),
         penw((QColor(Qt::white)));
    penb.setWidth(1);
    penw.setWidth(1);
    painter.setPen(penb);
    painter.drawLine(QPoint(p.x(),0),QPoint(p.x(),px.height()));
    painter.drawLine(QPoint(0,p.y()),QPoint(px.width(),p.y()));
    painter.setPen(penw);
    painter.drawLine(QPoint(p.x()-1,0),QPoint(p.x()-1,px.height()));
    painter.drawLine(QPoint(0,p.y()-1),QPoint(px.width(),p.y()-1));
    painter.end();
    ui->lblImg->setPixmap(px);
}
