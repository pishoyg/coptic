/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "mimagewidget.h"
#include "ui_mimagewidget.h"

MImageWidget::MImageWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MImageWidget),
    bgr(),
    _mode(Img),
    _longitude(0),
    _latitude(0),
    _valid_long(false),
    _valid_lat(false),
    _w(0)
{
    ui->setupUi(this);

    ui->gwArea->setNavButton(ui->tbNavigate,&_w);

    ui->ccPen->init("white",m_sett()->imgSelBorderColor().name(),tr("border color"),CTextColorChooser::Background);
    ui->ccFill->init("white",m_sett()->imgSelFillColor().name(),tr("fill color"),CTextColorChooser::Background);
    ui->spnBorder->setValue(m_sett()->imgSelBorderWidth());
    ui->spnOpacity->setValue(m_sett()->imgSelFillOpacity());

    bgr.addButton(ui->btMove,1);
    bgr.addButton(ui->btSelect,2);
    ui->gbSett->setVisible(false);
    ui->frameMap->hide();
}

MImageWidget::~MImageWidget()
{
    if(_w)
        delete _w;
    delete ui;
}

CMImage * MImageWidget::drawarea()
{
    return ui->gwArea;
}

void MImageWidget::on_gwArea_positionChanged(QPointF pos)
{
    QSize _csize(ui->gwArea->currentPageSize().toSize());
    if(_csize.isValid())
    {
        int real_x(-1),real_y(-1);
        int x((int)pos.x()),y((int)pos.y());
        if(x<0||x>_csize.width())
            ui->lblPosX->setText("N/A");
        else
            ui->lblPosX->setText(QString::number(real_x=x));

        if(y<0||y>_csize.height())
            ui->lblPosY->setText("N/A");
        else
            ui->lblPosY->setText(QString::number(real_y=y));

        if(_mode==Map)
        {
            double const onedlong=(double)_csize.width()/360,onedlat=(double)_csize.height()/180;

            if(real_x==-1)
            {
                _valid_long=false;
                ui->lblLong->setText("N/A");
            }
            else
            {
                _valid_long=true;
                _longitude=((double)real_x/onedlong)-180;
                ui->lblLong->setText(QString::number(_longitude,'f',2));
            }
            if(real_y==-1)
            {
                _valid_lat=false;
                ui->lblLat->setText("N/A");
            }
            else
            {
                _valid_lat=true;
                _latitude=(((double)real_y/onedlat)-90)*-1;
                ui->lblLat->setText(QString::number(_latitude,'f',2));
            }
        }
    }
    else
    {
        ui->lblPosX->setText("N/A");
        ui->lblPosY->setText("N/A");
        if(_mode==Map)
        {
            _valid_long=_valid_lat=false;
            ui->lblLong->setText("N/A");
            ui->lblLat->setText("N/A");
        }
    }
}

void MImageWidget::on_btImageAction_clicked(bool checked)
{
    if(checked)
        ui->gwArea->showPopupOnButton(ui->btImageAction);
}


void MImageWidget::on_btMove_clicked(bool checked)
{
    if(checked)
        ui->gwArea->setMouseMode(CMImage::Move,false);
}

void MImageWidget::on_btSelect_clicked(bool checked)
{
    if(checked)
        ui->gwArea->setMouseMode(CMImage::Select,false);
}

void MImageWidget::on_gwArea_mouseModeChanged(int mouse_mode)
{
    switch(mouse_mode)
    {
    case CMImage::Move :
        ui->btMove->setChecked(true);
        break;
    case CMImage::Select :
        ui->btSelect->setChecked(true);
        break;
    }
}

void MImageWidget::on_btSett_clicked(bool checked)
{
    ui->gbSett->setVisible(checked);
    ui->gwArea->setSettingsState(checked);
}

void MImageWidget::on_gwArea_settingsActivated(bool visible)
{
    ui->gbSett->setVisible(visible);
    ui->btSett->setChecked(visible);
}

void MImageWidget::on_spnBorder_valueChanged(int value)
{
    ui->gwArea->setSelectionBorderWidth(value);
}

void MImageWidget::on_spnOpacity_valueChanged(int value)
{
    QColor color(ui->ccFill->bgC());
    color.setAlpha(2.55*value);
    ui->gwArea->setSelectionFillColor(color);
}

void MImageWidget::on_ccPen_bgColorSelected(QColor color)
{
    ui->gwArea->setSelectionBorderColor(color);
}

void MImageWidget::on_ccFill_bgColorSelected(QColor color)
{
    color.setAlpha(2.55*ui->spnOpacity->value());
    ui->gwArea->setSelectionFillColor(color);
}

void MImageWidget::keyPressEvent (QKeyEvent * e)
{
    e->ignore();
    ui->gwArea->keyPressEvent(e);
    if(!e->isAccepted())
        QWidget::keyPressEvent(e);
}

void MImageWidget::hideEvent(QHideEvent * event)
{
    if(_w)
    {
        delete _w;
        _w=0;
    }
    event->accept();
}

void MImageWidget::setMode(ImgMode mode)
{
    _mode=mode;
    ui->frameMap->setVisible(_mode==Map);
}

void MImageWidget::on_tbGrid_clicked(bool checked)
{
    drawarea()->enableGrid(checked);
}

void MImageWidget::on_tbNavigate_clicked()
{
    if(_w)
        delete _w;
    _w=new MNavWnd(drawarea()->ptrPixmap(),(double)drawarea()->horizontalScrollBar()->value()/((double)drawarea()->horizontalScrollBar()->maximum()/100),(double)drawarea()->verticalScrollBar()->value()/((double)drawarea()->verticalScrollBar()->maximum()/100),this);
    connect(_w,SIGNAL(navigate(double,double)),this,SLOT(slot_navigate(double,double)));
    QPoint p(ui->tbNavigate->mapToGlobal(QPoint(0,0)));
    p.setY(p.y()+ui->tbNavigate->height());
    _w->move(p);
    _w->show();
    _w->activateWindow();
}

void MImageWidget::slot_navigate(double x_percent,double y_percent)
{
    drawarea()->centerOn(((double)drawarea()->grScene()->sceneRect().width()/100)*x_percent,((double)drawarea()->grScene()->sceneRect().height()/100)*y_percent);
}

void MImageWidget::closeNavigator()
{
    if(_w)
    {
        delete _w;
        _w=0;
    }
}
